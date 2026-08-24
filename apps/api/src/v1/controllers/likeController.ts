import type { Request, Response, NextFunction } from 'express';
import LikeService from '@services/likeService.js';
import { successResponse } from '@models/article.types.js';
import { AppError } from '@errors/AppError.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const like = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: articleId } = req.params;

    if (!UUID_REGEX.test(articleId)) {
      throw new AppError('Invalid article ID format', 400);
    }

    // req.user is guaranteed to exist because of authenticate middleware
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const userId = req.user!.userId;

    await LikeService.likeArticle(articleId, userId);

    res
      .status(200)
      .json(successResponse({ liked: true }, 'Article liked successfully'));
  } catch (error) {
    next(error);
  }
};

const unlike = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: articleId } = req.params;

    if (!UUID_REGEX.test(articleId)) {
      throw new AppError('Invalid article ID format', 400);
    }

    // req.user is guaranteed to exist because of authenticate middleware
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const userId = req.user!.userId;

    await LikeService.unlikeArticle(articleId, userId);

    res
      .status(200)
      .json(successResponse({ liked: false }, 'Article unliked successfully'));
  } catch (error) {
    next(error);
  }
};

const list = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: articleId } = req.params;

    if (!UUID_REGEX.test(articleId)) {
      throw new AppError('Invalid article ID format', 400);
    }

    const likers = await LikeService.getLikers(articleId);

    res
      .status(200)
      .json(successResponse(likers, 'Likers retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

export default { like, unlike, list };
