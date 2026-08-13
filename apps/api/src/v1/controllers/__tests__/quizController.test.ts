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
    } as any);

    await controller.generate(req as any, res as any, next);

    expect(mockQuizService.generateQuiz).toHaveBeenCalledWith(validArticleId);
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
    } as any);

    await controller.generate(req as any, res as any, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });
});
