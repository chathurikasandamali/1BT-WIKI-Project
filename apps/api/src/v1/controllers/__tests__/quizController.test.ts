import { jest } from '@jest/globals';
import { AppError } from '@errors/AppError.js';
import { makeMockReqResNext } from '../../__tests__/helpers/mockExpress.helpers.js';

jest.unstable_mockModule('@services/quizService.js', () => ({
  default: {
    generateQuiz: jest.fn(),
  },
}));

const { default: quizController } = await import('../quizController.js');
const { default: QuizService } = await import('@services/quizService.js');

const validArticleId = '1c9e6f64-9155-4f5e-b3a8-2f4d1c1a9b0e';

describe('quizController.generate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should reject an invalid article id with AppError 400', async () => {
    const { req, res, next } = makeMockReqResNext({
      params: { id: 'not-a-uuid' },
    } as any);

    await quizController.generate(req as any, res as any, next);

    expect(QuizService.generateQuiz).not.toHaveBeenCalled();
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
    (QuizService.generateQuiz as jest.Mock<any>).mockResolvedValue(quiz);

    const { req, res, next } = makeMockReqResNext({
      params: { id: validArticleId },
    } as any);

    await quizController.generate(req as any, res as any, next);

    expect(QuizService.generateQuiz).toHaveBeenCalledWith(validArticleId);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: quiz })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should forward service errors to next', async () => {
    const error = new AppError('Gemini request timed out', 504);
    (QuizService.generateQuiz as jest.Mock<any>).mockRejectedValue(error);

    const { req, res, next } = makeMockReqResNext({
      params: { id: validArticleId },
    } as any);

    await quizController.generate(req as any, res as any, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });
});
