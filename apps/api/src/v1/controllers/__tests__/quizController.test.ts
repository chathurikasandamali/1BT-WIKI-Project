import { jest } from '@jest/globals';
import { AppError } from '@errors/AppError.js';
import { createQuizController } from '@controllers/quizController.js';
import type { QuizService } from '@services/quizService.js';
import { makeMockReqResNext } from '../../__tests__/helpers/mockExpress.helpers.js';
import {randomUUID } from 'node:crypto'

const validArticleId = randomUUID();

const makeMockQuizService = (): QuizService =>
  ({
    generateQuiz: jest.fn(),
    pregenerateFallbackQuiz: jest.fn(),
    setFocusAspects: jest.fn(),
    getFocusAspects: jest.fn(),
    saveAsFallback: jest.fn(),
    submitQuiz: jest.fn(),
  }) as unknown as QuizService;

describe('quizController.generate', () => {
  let mockQuizService: QuizService;
  let controller: ReturnType<typeof createQuizController>;

  beforeEach(() => {
    mockQuizService = makeMockQuizService();
    controller = createQuizController(mockQuizService);
  });

  it('should reject an invalid article id with AppError 400', async () => {
    const { req, res, next } = makeMockReqResNext({
      params: { id: 'not-a-uuid' },
    } as any);

    await controller.generate(req as any, res as any, next);

    expect(mockQuizService.generateQuiz).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400 })
    );
  });

  it('should respond 201 with the generated quiz', async () => {
    const quiz = {
      quizId: 'quiz-1',
      articleId: validArticleId,
      isFallback: false,
      questions: [],
    };
    (mockQuizService.generateQuiz as jest.Mock<any>).mockResolvedValue(quiz);

    const { req, res, next } = makeMockReqResNext({
      params: { id: validArticleId },
      user: { userId: 'reader-1' } as any,
    } as any);

    await controller.generate(req as any, res as any, next);

    expect(mockQuizService.generateQuiz).toHaveBeenCalledWith(validArticleId, 'reader-1');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: quiz })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should forward service errors to next', async () => {
    const error = new AppError('Gemini request timed out', 504);
    (mockQuizService.generateQuiz as jest.Mock<any>).mockRejectedValue(error);

    const { req, res, next } = makeMockReqResNext({
      params: { id: validArticleId },
      user: { userId: 'reader-1' } as any,
    } as any);

    await controller.generate(req as any, res as any, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('quizController.setFocusAspects', () => {
  let mockQuizService: QuizService;
  let controller: ReturnType<typeof createQuizController>;

  beforeEach(() => {
    mockQuizService = makeMockQuizService();
    controller = createQuizController(mockQuizService);
  });

  it('should reject an invalid article id with AppError 400', async () => {
    const { req, res, next } = makeMockReqResNext({
      params: { id: 'not-a-uuid' },
      body: { aspects: 'Focus on branching' },
    } as any);

    await controller.setFocusAspects(req as any, res as any, next);

    expect(mockQuizService.setFocusAspects).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  it('should reject a non-string aspects body with AppError 400', async () => {
    const { req, res, next } = makeMockReqResNext({
      params: { id: validArticleId },
      body: {},
      user: { userId: 'author-1' } as any,
    } as any);

    await controller.setFocusAspects(req as any, res as any, next);

    expect(mockQuizService.setFocusAspects).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  it('should respond 200 with the saved aspects', async () => {
    (mockQuizService.setFocusAspects as jest.Mock<any>).mockResolvedValue('Focus on branching');

    const { req, res, next } = makeMockReqResNext({
      params: { id: validArticleId },
      body: { aspects: 'Focus on branching' },
      user: { userId: 'author-1' } as any,
    } as any);

    await controller.setFocusAspects(req as any, res as any, next);

    expect(mockQuizService.setFocusAspects).toHaveBeenCalledWith(
      validArticleId,
      'author-1',
      'Focus on branching'
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });

  it('should forward service errors to next', async () => {
    const error = new AppError('Only the author can set quiz focus aspects for this article', 403);
    (mockQuizService.setFocusAspects as jest.Mock<any>).mockRejectedValue(error);

    const { req, res, next } = makeMockReqResNext({
      params: { id: validArticleId },
      body: { aspects: 'Focus on branching' },
      user: { userId: 'someone-else' } as any,
    } as any);

    await controller.setFocusAspects(req as any, res as any, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});

describe('quizController.getFocusAspects', () => {
  let mockQuizService: QuizService;
  let controller: ReturnType<typeof createQuizController>;

  beforeEach(() => {
    mockQuizService = makeMockQuizService();
    controller = createQuizController(mockQuizService);
  });

  it('should reject an invalid article id with AppError 400', async () => {
    const { req, res, next } = makeMockReqResNext({
      params: { id: 'not-a-uuid' },
      user: { userId: 'author-1' } as any,
    } as any);

    await controller.getFocusAspects(req as any, res as any, next);

    expect(mockQuizService.getFocusAspects).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  it('should respond 200 with the saved aspects', async () => {
    (mockQuizService.getFocusAspects as jest.Mock<any>).mockResolvedValue('Focus on branching');

    const { req, res, next } = makeMockReqResNext({
      params: { id: validArticleId },
      user: { userId: 'author-1' } as any,
    } as any);

    await controller.getFocusAspects(req as any, res as any, next);

    expect(mockQuizService.getFocusAspects).toHaveBeenCalledWith(validArticleId, 'author-1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: { aspects: 'Focus on branching' } })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should respond 200 with null when nothing has been saved', async () => {
    (mockQuizService.getFocusAspects as jest.Mock<any>).mockResolvedValue(null);

    const { req, res, next } = makeMockReqResNext({
      params: { id: validArticleId },
      user: { userId: 'author-1' } as any,
    } as any);

    await controller.getFocusAspects(req as any, res as any, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: { aspects: null } })
    );
  });

  it('should forward service errors to next', async () => {
    const error = new AppError(
      'Only the author can view quiz focus aspects for this article',
      403
    );
    (mockQuizService.getFocusAspects as jest.Mock<any>).mockRejectedValue(error);

    const { req, res, next } = makeMockReqResNext({
      params: { id: validArticleId },
      user: { userId: 'someone-else' } as any,
    } as any);

    await controller.getFocusAspects(req as any, res as any, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});

describe('quizController.saveAsFallback', () => {
  let mockQuizService: QuizService;
  let controller: ReturnType<typeof createQuizController>;
  const validQuizId = randomUUID();

  beforeEach(() => {
    mockQuizService = makeMockQuizService();
    controller = createQuizController(mockQuizService);
  });

  it('should reject an invalid article id with AppError 400', async () => {
    const { req, res, next } = makeMockReqResNext({
      params: { id: 'not-a-uuid', quizId: validQuizId },
      user: { userId: 'author-1' } as any,
    } as any);

    await controller.saveAsFallback(req as any, res as any, next);

    expect(mockQuizService.saveAsFallback).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  it('should reject an invalid quiz id with AppError 400', async () => {
    const { req, res, next } = makeMockReqResNext({
      params: { id: validArticleId, quizId: 'not-a-uuid' },
      user: { userId: 'author-1' } as any,
    } as any);

    await controller.saveAsFallback(req as any, res as any, next);

    expect(mockQuizService.saveAsFallback).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  it('should respond 200 with the saved fallback quiz', async () => {
    const quiz = {
      quizId: validQuizId,
      articleId: validArticleId,
      isFallback: true,
      questions: [],
    };
    (mockQuizService.saveAsFallback as jest.Mock<any>).mockResolvedValue(quiz);

    const { req, res, next } = makeMockReqResNext({
      params: { id: validArticleId, quizId: validQuizId },
      user: { userId: 'author-1' } as any,
    } as any);

    await controller.saveAsFallback(req as any, res as any, next);

    expect(mockQuizService.saveAsFallback).toHaveBeenCalledWith(
      validArticleId,
      validQuizId,
      'author-1'
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: quiz })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should forward service errors to next', async () => {
    const error = new AppError('Quiz not found for this article', 404);
    (mockQuizService.saveAsFallback as jest.Mock<any>).mockRejectedValue(error);

    const { req, res, next } = makeMockReqResNext({
      params: { id: validArticleId, quizId: validQuizId },
      user: { userId: 'author-1' } as any,
    } as any);

    await controller.saveAsFallback(req as any, res as any, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});

describe('quizController.submit', () => {
  let mockQuizService: QuizService;
  let controller: ReturnType<typeof createQuizController>;
  const validQuizId = randomUUID();

  beforeEach(() => {
    mockQuizService = makeMockQuizService();
    controller = createQuizController(mockQuizService);
  });

  it('should reject an invalid article id with AppError 400', async () => {
    const { req, res, next } = makeMockReqResNext({
      params: { id: 'not-a-uuid', quizId: validQuizId },
      body: { answers: {} },
      user: { userId: 'reader-1' } as any,
    } as any);

    await controller.submit(req as any, res as any, next);

    expect(mockQuizService.submitQuiz).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  it('should reject an invalid quiz id with AppError 400', async () => {
    const { req, res, next } = makeMockReqResNext({
      params: { id: validArticleId, quizId: 'not-a-uuid' },
      body: { answers: {} },
      user: { userId: 'reader-1' } as any,
    } as any);

    await controller.submit(req as any, res as any, next);

    expect(mockQuizService.submitQuiz).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  it.each([
    ['not an object', 'not-an-object'],
    ['an array', []],
    ['null', null],
    ['values that are not number arrays', { q1: ['not-a-number'] }],
  ])('should reject %s answers body with AppError 400', async (_label, answers) => {
    const { req, res, next } = makeMockReqResNext({
      params: { id: validArticleId, quizId: validQuizId },
      body: { answers },
      user: { userId: 'reader-1' } as any,
    } as any);

    await controller.submit(req as any, res as any, next);

    expect(mockQuizService.submitQuiz).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  it('should respond 200 with the graded result', async () => {
    const result = {
      quizId: validQuizId,
      articleId: validArticleId,
      totalQuestions: 1,
      correctCount: 1,
      incorrectCount: 0,
      scorePercent: 100,
      results: [],
    };
    (mockQuizService.submitQuiz as jest.Mock<any>).mockResolvedValue(result);

    const { req, res, next } = makeMockReqResNext({
      params: { id: validArticleId, quizId: validQuizId },
      body: { answers: { q1: [0] } },
      user: { userId: 'reader-1' } as any,
    } as any);

    await controller.submit(req as any, res as any, next);

    expect(mockQuizService.submitQuiz).toHaveBeenCalledWith(validArticleId, validQuizId, {
      q1: [0],
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: result })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should forward service errors to next', async () => {
    const error = new AppError('Quiz not found for this article', 404);
    (mockQuizService.submitQuiz as jest.Mock<any>).mockRejectedValue(error);

    const { req, res, next } = makeMockReqResNext({
      params: { id: validArticleId, quizId: validQuizId },
      body: { answers: {} },
      user: { userId: 'reader-1' } as any,
    } as any);

    await controller.submit(req as any, res as any, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
