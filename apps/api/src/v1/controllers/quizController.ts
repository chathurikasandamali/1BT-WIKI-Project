import type { Request, Response, NextFunction } from 'express';
import QuizService from '@services/quizService.js';
import { successResponse } from '@models/article.types.js';
import { AppError } from '@errors/AppError.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

    const quiz = await QuizService.generateQuiz(articleId);

    res
      .status(201)
      .json(successResponse(quiz, 'Quiz generated successfully'));
  } catch (error) {
    next(error);
  }
};

export default { generate };
