import ArticleRepository from '@repositories/articleRepository.js';
import QuizRepository from '@repositories/quizRepository.js';
import quizProvider from '@v1/lib/llm/quizProviderFactory.js';
import type { QuizGenerationProvider } from '@v1/lib/llm/quizProvider.types.js';
import { extractTextFromTipTap } from '@utils/tiptapText.js';
import { PROMPT_VERSION } from '@v1/lib/prompts/quizPrompts.js';
import { AppError } from '@errors/AppError.js';
import { ArticleStatusValue, type Article } from '@models/article.types.js';
import {
  toPublicQuestions,
  type GenerateQuizResponse,
  type QuizRecord,
} from '@models/quiz.types.js';
import settingsService, { type SettingsService } from '@services/settingsService.js';

export interface QuizServiceDeps {
  articleRepository: typeof ArticleRepository;
  quizRepository: typeof QuizRepository;
  llmProvider: QuizGenerationProvider;
  settingsService: SettingsService;
}

const toResponse = (quiz: QuizRecord): GenerateQuizResponse => ({
  quizId: quiz.id,
  articleId: quiz.articleId,
  isFallback: quiz.isFallback,
  questions: toPublicQuestions(quiz.questions),
});

/**
 * Creates the quiz service with injected dependencies so callers can supply
 * mocks (tests) or the production singletons (default export).
 */
export const createQuizService = (deps: QuizServiceDeps) => {
  const { articleRepository, quizRepository, llmProvider, settingsService: settings } = deps;

  /**
   * Loads an article by id, translating any lookup failure into a clean
   * AppError instead of letting a raw Prisma/infra exception escape (which
   * the global error handler would otherwise turn into an opaque 500).
   */
  const findArticleOrThrow = async (articleId: string): Promise<Article> => {
    let article: Article | null;
    try {
      article = await articleRepository.findById(articleId);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error(`[QuizService] Failed to load article ${articleId}:`, error);
      throw new AppError('Database is unavailable', 503);
    }

    if (!article) {
      throw new AppError('Article not found', 404);
    }
    return article;
  };

  const loadPublishedArticle = async (articleId: string): Promise<Article> => {
    const article = await findArticleOrThrow(articleId);

    if (article.status !== ArticleStatusValue.Published) {
      throw new AppError(
        'Quiz can only be generated for Published articles',
        400
      );
    }

    return article;
  };

  /**
   * Same as `loadPublishedArticle`, but also allows the article's own author
   * to generate/preview a quiz while it is still Draft/Pending — so authors
   * can review fallback questions before publishing. Any other requester
   * still needs the article to be Published.
   */
  const loadGeneratableArticle = async (
    articleId: string,
    requesterId: string
  ): Promise<Article> => {
    const article = await findArticleOrThrow(articleId);

    if (
      article.status !== ArticleStatusValue.Published &&
      article.authorId !== requesterId
    ) {
      throw new AppError(
        'Quiz can only be generated for Published articles',
        400
      );
    }

    return article;
  };

  const generateAndStore = async (
    article: Article,
    isFallback: boolean
  ): Promise<QuizRecord> => {
    const articleText = extractTextFromTipTap(article.body); // needs to update the path of content

    if (articleText.length === 0) {
      throw new AppError('Article has no content to generate a quiz from', 422);
    }

    // Effective quiz config comes from the admin app_settings store; the
    // snapshot records exactly which config produced this quiz.
    const quizConfig = await settings.getQuizConfig();
    // Author-defined hint, if set, that steers what the questions emphasize.
    const focusAspects = await quizRepository.findFocusAspectsByArticleId(article.id);

    console.log("Calling llmProvider.generateQuestions with article title:", article.title);
    const questions = await llmProvider.generateQuestions({
      articleTitle: article.title,
      articleText,
      questionCount: quizConfig.questionCount,
      optionsPerQuestion: quizConfig.optionsPerQuestion,
      ...(focusAspects ? { focusAspects } : {}),
    });

    return quizRepository.create({
      articleId: article.id,
      isFallback,
      questions,
      configSnapshot: {
        promptVersion: PROMPT_VERSION,
        questionCount: quizConfig.questionCount,
        optionsPerQuestion: quizConfig.optionsPerQuestion,
        ...(focusAspects ? { focusAspects } : {}),
      },
    });
  };

  /**
   * Generates a quiz via the gemini API, persists it, and returns the
   * questions with correct answers stripped. Allowed for any authenticated
   * user on a Published article, or for the article's own author previewing
   * a Draft/Pending article. Falls back to the article's pre-generated quiz
   * when the Gemini API fails.
   */
  const generateQuiz = async (
    articleId: string,
    requesterId: string
  ): Promise<GenerateQuizResponse> => {
    const article = await loadGeneratableArticle(articleId, requesterId);

    try {
      const quiz = await generateAndStore(article, false);
      return toResponse(quiz);
    } catch (error) {
      // Domain errors (empty article) are the caller's problem; only infra/LLM
      // failures are eligible for the stored fallback quiz.
      if (error instanceof AppError && error.statusCode < 500) {
        throw error;
      }

      console.error(
        `[QuizService] Workflow generation failed for article ${articleId}, trying fallback:`,
        error
      );

      const fallback = await quizRepository.findLatestFallbackByArticleId(
        articleId
      );
      if (fallback) {
        return toResponse(fallback);
      }

      throw error;
    }
  };

  /**
   * Pre-generates a fallback quiz right after an article is Published so
   * `generateQuiz` has something to serve when the live Gemini API is down.
   * Never throws — callers invoke it fire-and-forget from the publish path.
   */
  const pregenerateFallbackQuiz = async (articleId: string): Promise<void> => {
    try {
      const article = await loadPublishedArticle(articleId);
      await generateAndStore(article, true);
    } catch (error) {
      console.error(
        `[QuizService] Fallback quiz pre-generation failed for article ${articleId}:`,
        error
      );
    }
  };

  const MAX_FOCUS_ASPECTS_LENGTH = 1000;

  /**
   * Sets (or overwrites) the author-defined focus-aspects hint used to steer
   * future quiz generations for this article. Author-only.
   */
  const setFocusAspects = async (
    articleId: string,
    requesterId: string,
    aspects: string
  ): Promise<string> => {
    const article = await findArticleOrThrow(articleId);
    if (article.authorId !== requesterId) {
      throw new AppError(
        'Only the author can set quiz focus aspects for this article',
        403
      );
    }

    const trimmed = aspects.trim();
    if (trimmed.length === 0 || trimmed.length > MAX_FOCUS_ASPECTS_LENGTH) {
      throw new AppError(
        `focusAspects must be between 1 and ${MAX_FOCUS_ASPECTS_LENGTH} characters`,
        400
      );
    }

    return quizRepository.upsertFocusAspects(articleId, trimmed, requesterId);
  };

  /**
   * Reads the author-defined focus-aspects hint for an article, if any.
   * Author-only.
   */
  const getFocusAspects = async (
    articleId: string,
    requesterId: string
  ): Promise<string | null> => {
    const article = await findArticleOrThrow(articleId);
    if (article.authorId !== requesterId) {
      throw new AppError(
        'Only the author can view quiz focus aspects for this article',
        403
      );
    }

    return quizRepository.findFocusAspectsByArticleId(articleId);
  };

  /**
   * Promotes an already-generated (and author-reviewed) quiz to be the
   * article's fallback quiz. Overwrites any existing fallback in place so
   * re-saving after an article edit replaces the stale one, instead of
   * mutating the previewed quiz row itself.
   */
  const saveAsFallback = async (
    articleId: string,
    quizId: string,
    requesterId: string
  ): Promise<GenerateQuizResponse> => {
    const sourceQuiz = await quizRepository.findById(quizId);
    if (!sourceQuiz || sourceQuiz.articleId !== articleId) {
      throw new AppError('Quiz not found for this article', 404);
    }

    const article = await findArticleOrThrow(articleId);
    if (article.authorId !== requesterId) {
      throw new AppError(
        'Only the author can save a fallback quiz for this article',
        403
      );
    }

    const questions = sourceQuiz.questions.map(
      ({ id: _id, quizId: _quizId, ...question }) => question
    );
    const configSnapshot = { ...sourceQuiz.configSnapshot, savedFromQuizId: quizId };

    const existingFallback = await quizRepository.findLatestFallbackByArticleId(articleId);
    const savedQuiz = existingFallback
      ? await quizRepository.update(existingFallback.id, { questions, configSnapshot })
      : await quizRepository.create({ articleId, isFallback: true, questions, configSnapshot });

    return toResponse(savedQuiz);
  };

  return {
    generateQuiz,
    pregenerateFallbackQuiz,
    setFocusAspects,
    getFocusAspects,
    saveAsFallback,
  };
};

export type QuizService = ReturnType<typeof createQuizService>;

export default createQuizService({
  articleRepository: ArticleRepository,
  quizRepository: QuizRepository,
  llmProvider: quizProvider,
  settingsService,
});
