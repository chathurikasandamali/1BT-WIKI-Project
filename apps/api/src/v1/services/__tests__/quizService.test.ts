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
        content: [{ type: 'text', text: 'Neon PostgreSQL supports branching, which lets every developer get an isolated copy of production data for testing and development without duplicating storage.' }],
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

const makeStoredQuiz = (isFallback: boolean, overrides: Record<string, unknown> = {}) => ({
  id: 'quiz-1',
  articleId,
  isFallback,
  generatedAt: new Date(),
  configSnapshot: { promptVersion: '1.0.0' },
  questions: makeGeneratedQuestions().map((q, i) => ({
    ...q,
    id: `question-${i}`,
    quizId: 'quiz-1',
  })),
  ...overrides,
});

const makeMockArticleRepo = () => ({
  findById: jest.fn<() => Promise<unknown>>(),
});

const makeMockQuizRepo = () => ({
  create: jest.fn<() => Promise<unknown>>(),
  findLatestFallbackByArticleId: jest.fn<() => Promise<unknown>>(),
  findFocusAspectsByArticleId: jest.fn<() => Promise<string | null>>().mockResolvedValue(null),
  upsertFocusAspects: jest.fn<() => Promise<string>>(),
  findById: jest.fn<() => Promise<unknown>>(),
  update: jest.fn<() => Promise<unknown>>(),
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

    await expect(service.generateQuiz(articleId, 'reader-1')).rejects.toThrow(
      new AppError('Article not found', 404)
    );
  });

  it('should throw AppError 503 (not a raw error) when the article lookup fails', async () => {
    mockArticleRepo.findById.mockRejectedValue(new Error('connection reset'));

    await expect(service.generateQuiz(articleId, 'reader-1')).rejects.toThrow(
      new AppError('Database is unavailable', 503)
    );
  });

  it.each(['Draft', 'Pending', 'Unpublished'])(
    'should throw AppError 400 if article status is %s and requester is not the author',
    async (status) => {
      mockArticleRepo.findById.mockResolvedValue({
        ...publishedArticle,
        status,
      });

      await expect(service.generateQuiz(articleId, 'reader-1')).rejects.toThrow(
        new AppError('Quiz can only be generated for Published articles', 400)
      );
    }
  );

  it.each(['Draft', 'Pending', 'Unpublished'])(
    'should allow the article author to generate a preview quiz when status is %s',
    async (status) => {
      mockArticleRepo.findById.mockResolvedValue({
        ...publishedArticle,
        status,
      });
      mockGemini.generateQuestions.mockResolvedValue(makeGeneratedQuestions());
      mockQuizRepo.create.mockResolvedValue(makeStoredQuiz(false));

      const result = await service.generateQuiz(articleId, 'author-1');

      expect(result.quizId).toBe('quiz-1');
      expect(mockQuizRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ articleId, isFallback: false })
      );
    }
  );

  it('should throw AppError 422 if the article body has no text', async () => {
    mockArticleRepo.findById.mockResolvedValue({
      ...publishedArticle,
      body: { type: 'doc', content: [] },
    });

    await expect(service.generateQuiz(articleId, 'reader-1')).rejects.toThrow(
      new AppError('Article has no content to generate a quiz from', 422)
    );
    expect(mockGemini.generateQuestions).not.toHaveBeenCalled();
    expect(mockQuizRepo.findLatestFallbackByArticleId).not.toHaveBeenCalled();
  });

  it('should generate, persist, and return questions without correct answers', async () => {
    mockArticleRepo.findById.mockResolvedValue(publishedArticle);
    mockGemini.generateQuestions.mockResolvedValue(makeGeneratedQuestions());
    mockQuizRepo.create.mockResolvedValue(makeStoredQuiz(false));

    const result = await service.generateQuiz(articleId, 'reader-1');

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

  it('should pass the author-saved focus aspects to the LLM provider when set', async () => {
    mockArticleRepo.findById.mockResolvedValue(publishedArticle);
    mockQuizRepo.findFocusAspectsByArticleId.mockResolvedValue('Focus on branching');
    mockGemini.generateQuestions.mockResolvedValue(makeGeneratedQuestions());
    mockQuizRepo.create.mockResolvedValue(makeStoredQuiz(false));

    await service.generateQuiz(articleId, 'reader-1');

    expect(mockGemini.generateQuestions).toHaveBeenCalledWith(
      expect.objectContaining({ focusAspects: 'Focus on branching' })
    );
  });

  it('should not pass a focusAspects key when none is saved', async () => {
    mockArticleRepo.findById.mockResolvedValue(publishedArticle);
    mockGemini.generateQuestions.mockResolvedValue(makeGeneratedQuestions());
    mockQuizRepo.create.mockResolvedValue(makeStoredQuiz(false));

    await service.generateQuiz(articleId, 'reader-1');

    const [callArgs] = mockGemini.generateQuestions.mock.calls[0] as unknown as [
      Record<string, unknown>
    ];
    expect(callArgs).not.toHaveProperty('focusAspects');
  });

  it('should serve the stored fallback quiz when the Gemini output is invalid', async () => {
    mockArticleRepo.findById.mockResolvedValue(publishedArticle);
    mockGemini.generateQuestions.mockRejectedValue(
      new AppError('Generated quiz payload is not valid JSON', 502)
    );
    mockQuizRepo.findLatestFallbackByArticleId.mockResolvedValue(
      makeStoredQuiz(true)
    );

    const result = await service.generateQuiz(articleId, 'reader-1');

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

    const result = await service.generateQuiz(articleId, 'reader-1');

    expect(result.isFallback).toBe(true);
  });

  it('should rethrow the Gemini error when no fallback quiz exists', async () => {
    mockArticleRepo.findById.mockResolvedValue(publishedArticle);
    mockGemini.generateQuestions.mockRejectedValue(
      new AppError('Gemini request timed out', 504)
    );
    mockQuizRepo.findLatestFallbackByArticleId.mockResolvedValue(null);

    await expect(service.generateQuiz(articleId, 'reader-1')).rejects.toThrow(
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

describe('QuizService.setFocusAspects', () => {
  let mockArticleRepo: ReturnType<typeof makeMockArticleRepo>;
  let mockQuizRepo: ReturnType<typeof makeMockQuizRepo>;
  let mockGemini: ReturnType<typeof makeMockGemini>;
  let mockSettingsService: ReturnType<typeof makeMockSettingsService>;
  let service: QuizService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockArticleRepo = makeMockArticleRepo();
    mockQuizRepo = makeMockQuizRepo();
    mockGemini = makeMockGemini();
    mockSettingsService = makeMockSettingsService();
    service = createQuizService({
      articleRepository: mockArticleRepo as unknown as QuizServiceDeps['articleRepository'],
      quizRepository: mockQuizRepo as unknown as QuizServiceDeps['quizRepository'],
      llmProvider: mockGemini as unknown as QuizServiceDeps['llmProvider'],
      settingsService: mockSettingsService as unknown as QuizServiceDeps['settingsService'],
    });
  });

  it('should throw AppError 404 if the article is not found', async () => {
    mockArticleRepo.findById.mockResolvedValue(null);

    await expect(
      service.setFocusAspects(articleId, 'author-1', 'Focus on branching')
    ).rejects.toThrow(new AppError('Article not found', 404));
  });

  it('should throw AppError 403 if the requester is not the author', async () => {
    mockArticleRepo.findById.mockResolvedValue(publishedArticle);

    await expect(
      service.setFocusAspects(articleId, 'someone-else', 'Focus on branching')
    ).rejects.toThrow(
      new AppError('Only the author can set quiz focus aspects for this article', 403)
    );
    expect(mockQuizRepo.upsertFocusAspects).not.toHaveBeenCalled();
  });

  it('should throw AppError 400 for empty aspects', async () => {
    mockArticleRepo.findById.mockResolvedValue(publishedArticle);

    await expect(
      service.setFocusAspects(articleId, 'author-1', '   ')
    ).rejects.toThrow(AppError);
    expect(mockQuizRepo.upsertFocusAspects).not.toHaveBeenCalled();
  });

  it('should throw AppError 400 for aspects longer than 1000 characters', async () => {
    mockArticleRepo.findById.mockResolvedValue(publishedArticle);

    await expect(
      service.setFocusAspects(articleId, 'author-1', 'a'.repeat(1001))
    ).rejects.toThrow(AppError);
    expect(mockQuizRepo.upsertFocusAspects).not.toHaveBeenCalled();
  });

  it('should trim and persist valid aspects for the author', async () => {
    mockArticleRepo.findById.mockResolvedValue(publishedArticle);
    mockQuizRepo.upsertFocusAspects.mockResolvedValue('Focus on branching');

    const result = await service.setFocusAspects(
      articleId,
      'author-1',
      '  Focus on branching  '
    );

    expect(mockQuizRepo.upsertFocusAspects).toHaveBeenCalledWith(
      articleId,
      'Focus on branching',
      'author-1'
    );
    expect(result).toBe('Focus on branching');
  });
});

describe('QuizService.getFocusAspects', () => {
  let mockArticleRepo: ReturnType<typeof makeMockArticleRepo>;
  let mockQuizRepo: ReturnType<typeof makeMockQuizRepo>;
  let mockGemini: ReturnType<typeof makeMockGemini>;
  let mockSettingsService: ReturnType<typeof makeMockSettingsService>;
  let service: QuizService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockArticleRepo = makeMockArticleRepo();
    mockQuizRepo = makeMockQuizRepo();
    mockGemini = makeMockGemini();
    mockSettingsService = makeMockSettingsService();
    service = createQuizService({
      articleRepository: mockArticleRepo as unknown as QuizServiceDeps['articleRepository'],
      quizRepository: mockQuizRepo as unknown as QuizServiceDeps['quizRepository'],
      llmProvider: mockGemini as unknown as QuizServiceDeps['llmProvider'],
      settingsService: mockSettingsService as unknown as QuizServiceDeps['settingsService'],
    });
  });

  it('should throw AppError 404 if the article is not found', async () => {
    mockArticleRepo.findById.mockResolvedValue(null);

    await expect(
      service.getFocusAspects(articleId, 'author-1')
    ).rejects.toThrow(new AppError('Article not found', 404));
  });

  it('should throw AppError 403 if the requester is not the author', async () => {
    mockArticleRepo.findById.mockResolvedValue(publishedArticle);

    await expect(
      service.getFocusAspects(articleId, 'someone-else')
    ).rejects.toThrow(
      new AppError('Only the author can view quiz focus aspects for this article', 403)
    );
    expect(mockQuizRepo.findFocusAspectsByArticleId).not.toHaveBeenCalled();
  });

  it('should return null when no aspects have been saved', async () => {
    mockArticleRepo.findById.mockResolvedValue(publishedArticle);
    mockQuizRepo.findFocusAspectsByArticleId.mockResolvedValue(null);

    await expect(service.getFocusAspects(articleId, 'author-1')).resolves.toBeNull();
  });

  it('should return the saved aspects for the author', async () => {
    mockArticleRepo.findById.mockResolvedValue(publishedArticle);
    mockQuizRepo.findFocusAspectsByArticleId.mockResolvedValue('Focus on branching');

    await expect(service.getFocusAspects(articleId, 'author-1')).resolves.toBe(
      'Focus on branching'
    );
  });
});

describe('QuizService.saveAsFallback', () => {
  let mockArticleRepo: ReturnType<typeof makeMockArticleRepo>;
  let mockQuizRepo: ReturnType<typeof makeMockQuizRepo>;
  let mockGemini: ReturnType<typeof makeMockGemini>;
  let mockSettingsService: ReturnType<typeof makeMockSettingsService>;
  let service: QuizService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockArticleRepo = makeMockArticleRepo();
    mockQuizRepo = makeMockQuizRepo();
    mockGemini = makeMockGemini();
    mockSettingsService = makeMockSettingsService();
    service = createQuizService({
      articleRepository: mockArticleRepo as unknown as QuizServiceDeps['articleRepository'],
      quizRepository: mockQuizRepo as unknown as QuizServiceDeps['quizRepository'],
      llmProvider: mockGemini as unknown as QuizServiceDeps['llmProvider'],
      settingsService: mockSettingsService as unknown as QuizServiceDeps['settingsService'],
    });
  });

  it('should throw AppError 404 when the quiz does not exist', async () => {
    mockQuizRepo.findById.mockResolvedValue(null);

    await expect(
      service.saveAsFallback(articleId, 'quiz-1', 'author-1')
    ).rejects.toThrow(new AppError('Quiz not found for this article', 404));
  });

  it('should throw AppError 404 when the quiz belongs to a different article', async () => {
    mockQuizRepo.findById.mockResolvedValue(makeStoredQuiz(false, { articleId: 'other-article' }));

    await expect(
      service.saveAsFallback(articleId, 'quiz-1', 'author-1')
    ).rejects.toThrow(new AppError('Quiz not found for this article', 404));
  });

  it('should throw AppError 403 when the requester is not the author', async () => {
    mockQuizRepo.findById.mockResolvedValue(makeStoredQuiz(false));
    mockArticleRepo.findById.mockResolvedValue(publishedArticle);

    await expect(
      service.saveAsFallback(articleId, 'quiz-1', 'someone-else')
    ).rejects.toThrow(
      new AppError('Only the author can save a fallback quiz for this article', 403)
    );
    expect(mockQuizRepo.create).not.toHaveBeenCalled();
    expect(mockQuizRepo.update).not.toHaveBeenCalled();
  });

  it('should insert a new fallback quiz when none exists yet', async () => {
    mockQuizRepo.findById.mockResolvedValue(makeStoredQuiz(false));
    mockArticleRepo.findById.mockResolvedValue(publishedArticle);
    mockQuizRepo.findLatestFallbackByArticleId.mockResolvedValue(null);
    mockQuizRepo.create.mockResolvedValue(makeStoredQuiz(true, { id: 'quiz-2' }));

    const result = await service.saveAsFallback(articleId, 'quiz-1', 'author-1');

    expect(mockQuizRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        articleId,
        isFallback: true,
        configSnapshot: expect.objectContaining({ savedFromQuizId: 'quiz-1' }),
      })
    );
    expect(mockQuizRepo.update).not.toHaveBeenCalled();
    expect(result.isFallback).toBe(true);
    for (const question of result.questions) {
      expect(question).not.toHaveProperty('correctIndexes');
    }
  });

  it('should overwrite the existing fallback quiz in place when one already exists', async () => {
    mockQuizRepo.findById.mockResolvedValue(makeStoredQuiz(false));
    mockArticleRepo.findById.mockResolvedValue(publishedArticle);
    mockQuizRepo.findLatestFallbackByArticleId.mockResolvedValue(
      makeStoredQuiz(true, { id: 'existing-fallback' })
    );
    mockQuizRepo.update.mockResolvedValue(makeStoredQuiz(true, { id: 'existing-fallback' }));

    const result = await service.saveAsFallback(articleId, 'quiz-1', 'author-1');

    expect(mockQuizRepo.update).toHaveBeenCalledWith(
      'existing-fallback',
      expect.objectContaining({
        configSnapshot: expect.objectContaining({ savedFromQuizId: 'quiz-1' }),
      })
    );
    expect(mockQuizRepo.create).not.toHaveBeenCalled();
    expect(result.quizId).toBe('existing-fallback');
  });
});

describe('QuizService.submitQuiz', () => {
  let mockArticleRepo: ReturnType<typeof makeMockArticleRepo>;
  let mockQuizRepo: ReturnType<typeof makeMockQuizRepo>;
  let mockGemini: ReturnType<typeof makeMockGemini>;
  let mockSettingsService: ReturnType<typeof makeMockSettingsService>;
  let service: QuizService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockArticleRepo = makeMockArticleRepo();
    mockQuizRepo = makeMockQuizRepo();
    mockGemini = makeMockGemini();
    mockSettingsService = makeMockSettingsService();
    service = createQuizService({
      articleRepository: mockArticleRepo as unknown as QuizServiceDeps['articleRepository'],
      quizRepository: mockQuizRepo as unknown as QuizServiceDeps['quizRepository'],
      llmProvider: mockGemini as unknown as QuizServiceDeps['llmProvider'],
      settingsService: mockSettingsService as unknown as QuizServiceDeps['settingsService'],
    });
  });

  it('should throw AppError 404 when the quiz does not exist', async () => {
    mockQuizRepo.findById.mockResolvedValue(null);

    await expect(service.submitQuiz(articleId, 'quiz-1', {})).rejects.toThrow(
      new AppError('Quiz not found for this article', 404)
    );
  });

  it('should throw AppError 404 when the quiz belongs to a different article', async () => {
    mockQuizRepo.findById.mockResolvedValue(
      makeStoredQuiz(false, { articleId: 'other-article' })
    );

    await expect(service.submitQuiz(articleId, 'quiz-1', {})).rejects.toThrow(
      new AppError('Quiz not found for this article', 404)
    );
  });

  it('should grade single-answer questions and treat a missing answer as incorrect', async () => {
    const quiz = makeStoredQuiz(false, {
      questions: [
        { id: 'q1', question: 'Q1?', type: 'mcq', options: ['A', 'B'], correctIndexes: [1], explanation: '', quizId: 'quiz-1' },
        { id: 'q2', question: 'Q2?', type: 'mcq', options: ['A', 'B'], correctIndexes: [0], explanation: '', quizId: 'quiz-1' },
      ],
    });
    mockQuizRepo.findById.mockResolvedValue(quiz);

    const result = await service.submitQuiz(articleId, 'quiz-1', { q1: [1] });

    expect(result.totalQuestions).toBe(2);
    expect(result.correctCount).toBe(1);
    expect(result.incorrectCount).toBe(1);
    expect(result.scorePercent).toBe(50);
    expect(result.results).toEqual([
      expect.objectContaining({ id: 'q1', selected: [1], correctIndexes: [1], isCorrect: true }),
      expect.objectContaining({ id: 'q2', selected: [], correctIndexes: [0], isCorrect: false }),
    ]);
  });

  it('should grade multi-answer questions by set equality regardless of order or duplicates', async () => {
    const quiz = makeStoredQuiz(false, {
      questions: [
        {
          id: 'q1',
          question: 'Pick primes',
          type: 'multiple_choice',
          options: ['2', '3', '4'],
          correctIndexes: [0, 1],
          explanation: '',
          quizId: 'quiz-1',
        },
      ],
    });
    mockQuizRepo.findById.mockResolvedValue(quiz);

    const result = await service.submitQuiz(articleId, 'quiz-1', { q1: [1, 0, 1] });

    expect(result.correctCount).toBe(1);
    expect(result.scorePercent).toBe(100);
    expect(result.results[0]).toEqual(
      expect.objectContaining({ isCorrect: true })
    );
  });
});
