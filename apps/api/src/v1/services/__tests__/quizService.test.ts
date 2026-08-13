import { jest } from '@jest/globals';
import { AppError } from '@errors/AppError.js';
import type { GeneratedQuizQuestion } from '@models/quiz.types.js';
import {
  createQuizService,
  type QuizService,
  type QuizServiceDeps,
} from '../quizService.js';

const articleId = 'article-123';

const quizConfig = { questionCount: 10, optionsPerQuestion: 4 };

const publishedArticle = {
  id: articleId,
  title: 'Test Article',
  authorId: 'author-1',
  status: 'Published',
  body: {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Neon PostgreSQL supports branching.' }],
      },
    ],
  },
};

const makeGeneratedQuestions = (): GeneratedQuizQuestion[] =>
  Array.from({ length: quizConfig.questionCount }, (_, i) => ({
    question: `Question ${i + 1}?`,
    type: i === 0 ? 'multiple_choice' : 'mcq',
    options: ['A', 'B', 'C', 'D'],
    correctIndexes: i === 0 ? [0, 1] : [0],
    explanation: `Explanation ${i + 1}`,
  }));

const makeStoredQuiz = (isFallback: boolean) => ({
  id: 'quiz-1',
  articleId,
  isFallback,
  generatedAt: new Date(),
  questions: makeGeneratedQuestions().map((q, i) => ({
    ...q,
    id: `question-${i}`,
    quizId: 'quiz-1',
  })),
});

const makeMockArticleRepo = () => ({
  findById: jest.fn<() => Promise<unknown>>(),
});

const makeMockQuizRepo = () => ({
  create: jest.fn<() => Promise<unknown>>(),
  findLatestFallbackByArticleId: jest.fn<() => Promise<unknown>>(),
});

const makeMockGemini = () => ({
  generateQuestions: jest.fn<() => Promise<GeneratedQuizQuestion[]>>(),
});

const makeMockSettingsService = () => ({
  getQuizConfig: jest.fn<() => Promise<unknown>>(),
});

describe('QuizService.generateQuiz', () => {
  let mockArticleRepo: ReturnType<typeof makeMockArticleRepo>;
  let mockQuizRepo: ReturnType<typeof makeMockQuizRepo>;
  let mockGemini: ReturnType<typeof makeMockGemini>;
  let mockSettingsService: ReturnType<typeof makeMockSettingsService>;
  let service: QuizService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockArticleRepo = makeMockArticleRepo();
    mockQuizRepo = makeMockQuizRepo();
    mockGemini = makeMockGemini();
    mockSettingsService = makeMockSettingsService();
    mockSettingsService.getQuizConfig.mockResolvedValue(quizConfig);
    service = createQuizService({
      articleRepository: mockArticleRepo as unknown as QuizServiceDeps['articleRepository'],
      quizRepository: mockQuizRepo as unknown as QuizServiceDeps['quizRepository'],
      llmProvider: mockGemini as unknown as QuizServiceDeps['llmProvider'],
      settingsService: mockSettingsService as unknown as QuizServiceDeps['settingsService'],
    });
  });

  it('should throw AppError 404 if article is not found', async () => {
    mockArticleRepo.findById.mockResolvedValue(null);

    await expect(service.generateQuiz(articleId)).rejects.toThrow(
      new AppError('Article not found', 404)
    );
  });

  it.each(['Draft', 'Pending', 'Unpublished'])(
    'should throw AppError 400 if article status is %s',
    async (status) => {
      mockArticleRepo.findById.mockResolvedValue({
        ...publishedArticle,
        status,
      });

      await expect(service.generateQuiz(articleId)).rejects.toThrow(
        new AppError('Quiz can only be generated for Published articles', 400)
      );
    }
  );

  it('should throw AppError 422 if the article body has no text', async () => {
    mockArticleRepo.findById.mockResolvedValue({
      ...publishedArticle,
      body: { type: 'doc', content: [] },
    });

    await expect(service.generateQuiz(articleId)).rejects.toThrow(
      new AppError('Article has no content to generate a quiz from', 422)
    );
    expect(mockGemini.generateQuestions).not.toHaveBeenCalled();
    expect(mockQuizRepo.findLatestFallbackByArticleId).not.toHaveBeenCalled();
  });

  it('should generate, persist, and return questions without correct answers', async () => {
    mockArticleRepo.findById.mockResolvedValue(publishedArticle);
    mockGemini.generateQuestions.mockResolvedValue(makeGeneratedQuestions());
    mockQuizRepo.create.mockResolvedValue(makeStoredQuiz(false));

    const result = await service.generateQuiz(articleId);

    expect(mockGemini.generateQuestions).toHaveBeenCalledWith(
      expect.objectContaining({
        articleTitle: 'Test Article',
        questionCount: quizConfig.questionCount,
        optionsPerQuestion: quizConfig.optionsPerQuestion,
      })
    );
    expect(mockQuizRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ articleId, isFallback: false })
    );

    expect(result.quizId).toBe('quiz-1');
    expect(result.isFallback).toBe(false);
    expect(result.questions).toHaveLength(quizConfig.questionCount);
    for (const question of result.questions) {
      expect(question).not.toHaveProperty('correctIndexes');
      expect(question).not.toHaveProperty('explanation');
    }
  });

  it('should serve the stored fallback quiz when the Gemini output is invalid', async () => {
    mockArticleRepo.findById.mockResolvedValue(publishedArticle);
    mockGemini.generateQuestions.mockRejectedValue(
      new AppError('Generated quiz payload is not valid JSON', 502)
    );
    mockQuizRepo.findLatestFallbackByArticleId.mockResolvedValue(
      makeStoredQuiz(true)
    );

    const result = await service.generateQuiz(articleId);

    expect(result.isFallback).toBe(true);
    expect(result.questions).toHaveLength(quizConfig.questionCount);
    expect(mockQuizRepo.create).not.toHaveBeenCalled();
  });

  it('should serve the stored fallback quiz when the Gemini call fails', async () => {
    mockArticleRepo.findById.mockResolvedValue(publishedArticle);
    mockGemini.generateQuestions.mockRejectedValue(
      new AppError('Failed to reach Gemini', 502)
    );
    mockQuizRepo.findLatestFallbackByArticleId.mockResolvedValue(
      makeStoredQuiz(true)
    );

    const result = await service.generateQuiz(articleId);

    expect(result.isFallback).toBe(true);
  });

  it('should rethrow the Gemini error when no fallback quiz exists', async () => {
    mockArticleRepo.findById.mockResolvedValue(publishedArticle);
    mockGemini.generateQuestions.mockRejectedValue(
      new AppError('Gemini request timed out', 504)
    );
    mockQuizRepo.findLatestFallbackByArticleId.mockResolvedValue(null);

    await expect(service.generateQuiz(articleId)).rejects.toThrow(
      new AppError('Gemini request timed out', 504)
    );
  });
});

describe('QuizService.pregenerateFallbackQuiz', () => {
  let mockArticleRepo: ReturnType<typeof makeMockArticleRepo>;
  let mockQuizRepo: ReturnType<typeof makeMockQuizRepo>;
  let mockGemini: ReturnType<typeof makeMockGemini>;
  let mockSettingsService: ReturnType<typeof makeMockSettingsService>;
  let service: QuizService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockArticleRepo = makeMockArticleRepo();
    mockQuizRepo = makeMockQuizRepo();
    mockGemini = makeMockGemini();
    mockSettingsService = makeMockSettingsService();
    mockSettingsService.getQuizConfig.mockResolvedValue(quizConfig);
    service = createQuizService({
      articleRepository: mockArticleRepo as unknown as QuizServiceDeps['articleRepository'],
      quizRepository: mockQuizRepo as unknown as QuizServiceDeps['quizRepository'],
      llmProvider: mockGemini as unknown as QuizServiceDeps['llmProvider'],
      settingsService: mockSettingsService as unknown as QuizServiceDeps['settingsService'],
    });
  });

  it('should persist a fallback quiz for a published article', async () => {
    mockArticleRepo.findById.mockResolvedValue(publishedArticle);
    mockGemini.generateQuestions.mockResolvedValue(makeGeneratedQuestions());
    mockQuizRepo.create.mockResolvedValue(makeStoredQuiz(true));

    await service.pregenerateFallbackQuiz(articleId);

    expect(mockQuizRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ articleId, isFallback: true })
    );
  });

  it('should swallow errors instead of throwing', async () => {
    mockArticleRepo.findById.mockResolvedValue(publishedArticle);
    mockGemini.generateQuestions.mockRejectedValue(
      new AppError('Failed to reach Gemini', 502)
    );

    await expect(
      service.pregenerateFallbackQuiz(articleId)
    ).resolves.toBeUndefined();
    expect(mockQuizRepo.create).not.toHaveBeenCalled();
  });
});
