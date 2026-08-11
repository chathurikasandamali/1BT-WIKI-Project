import ArticleRepository from '@repositories/articleRepository.js';
import QuizRepository from '@repositories/quizRepository.js';
import geminiClient from '@/v1/lib/geminiClient.js';
import { extractTextFromTipTap } from '@utils/tiptapText.js';
import { PROMPT_VERSION } from '@v1/lib/prompts/quizPrompts.js';
import { AppError } from '@errors/AppError.js';
import { ArticleStatusValue, type Article } from '@models/article.types.js';
import {
  DEFAULT_QUESTION_COUNT,
  parseGeneratedQuestions,
  toPublicQuestions,
  type GenerateQuizResponse,
  type QuizRecord,
} from '@models/quiz.types.js';
import { TechTalk } from '../types/techTalk.types.js';

const toResponse = (quiz: QuizRecord): GenerateQuizResponse => ({
  quizId: quiz.id,
  articleId: quiz.articleId,
  isFallback: quiz.isFallback,
  questions: toPublicQuestions(quiz.questions),
});

const loadPublishedArticle = async (articleId: string): Promise<Article> => {
  const article = await ArticleRepository.findById(articleId);

  if (!article) {
    throw new AppError('Article not found', 404);
  }
  if (article.status !== ArticleStatusValue.Published) {
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
  console.log("Calling geminiClient.generateQuestions with article title:", article.title);
  const rawOutput = await geminiClient.generateQuestions({
    articleTitle: article.title,
    articleText,
    questionCount: DEFAULT_QUESTION_COUNT,
  });

  const questions = parseGeneratedQuestions(rawOutput, DEFAULT_QUESTION_COUNT);

  return QuizRepository.create({
    articleId: article.id,
    isFallback,
    questions,
    configSnapshot: {
      promptVersion: PROMPT_VERSION,
      questionCount: DEFAULT_QUESTION_COUNT,
    },
  });
};

/**
 * Generates a quiz for a Published article via the gemini API,
 * persists it, and returns the questions with correct answers stripped.
 * Falls back to the article's pre-generated quiz when the Gemini API fails.
 */
const generateQuiz = async (
  articleId: string
): Promise<GenerateQuizResponse> => {
  const article = await loadPublishedArticle(articleId);

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

    const fallback = await QuizRepository.findLatestFallbackByArticleId(
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

export default { generateQuiz, pregenerateFallbackQuiz };
