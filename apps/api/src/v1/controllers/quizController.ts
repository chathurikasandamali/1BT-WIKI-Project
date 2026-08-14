import type { Request, Response, NextFunction } from 'express';
import defaultQuizService, { type QuizService } from '@services/quizService.js';
import { successResponse } from '@models/article.types.js';
import { AppError } from '@errors/AppError.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Creates the quiz controller with an injected quiz service so callers can
 * supply mocks (tests) or the production singleton (default export).
 */
export const createQuizController = (
  quizService: QuizService = defaultQuizService
) => {
  const generate = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id: articleId } = req.params;

      if (!UUID_REGEX.test(articleId)) {
        throw new AppError('Invalid article ID format', 400);
      }

      const quiz = await quizService.generateQuiz(articleId);

      res
        .status(201)
        .json(successResponse(quiz, 'Quiz generated successfully'));
    } catch (error) {
      next(error);
    }
  };

  const setFocusAspects = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id: articleId } = req.params;

      if (!UUID_REGEX.test(articleId)) {
        throw new AppError('Invalid article ID format', 400);
      }

      const { aspects } = req.body as { aspects?: unknown };
      if (typeof aspects !== 'string') {
        throw new AppError('aspects must be a string', 400);
      }

      const userId = req.user!.userId;
      const saved = await quizService.setFocusAspects(articleId, userId, aspects);

      res
        .status(200)
        .json(successResponse({ aspects: saved }, 'Quiz focus aspects updated'));
    } catch (error) {
      next(error);
    }
  };

  const getFocusAspects = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id: articleId } = req.params;

      if (!UUID_REGEX.test(articleId)) {
        throw new AppError('Invalid article ID format', 400);
      }

      const userId = req.user!.userId;
      const aspects = await quizService.getFocusAspects(articleId, userId);

      res
        .status(200)
        .json(successResponse({ aspects }, 'Quiz focus aspects retrieved'));
    } catch (error) {
      next(error);
    }
  };

  const saveAsFallback = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id: articleId, quizId } = req.params;

      if (!UUID_REGEX.test(articleId) || !UUID_REGEX.test(quizId)) {
        throw new AppError('Invalid article or quiz ID format', 400);
      }

      const userId = req.user!.userId;
      const quiz = await quizService.saveAsFallback(articleId, quizId, userId);

      res
        .status(200)
        .json(successResponse(quiz, 'Quiz saved as the fallback quiz'));
    } catch (error) {
      next(error);
    }
  };

  return { generate, setFocusAspects, getFocusAspects, saveAsFallback };
};

export default createQuizController();
