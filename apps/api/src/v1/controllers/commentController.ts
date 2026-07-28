import type { Request, Response, NextFunction } from 'express';
import CommentService from '@services/commentService.js';
import { successResponse } from '@models/article.types.js';

const create = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: articleId } = req.params;
    // req.user is guaranteed to exist because of authenticate middleware
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const authorId = req.user!.userId;
    const body = req.body.body as string | undefined;

    const comment = await CommentService.addComment(articleId, authorId, body);

    res
      .status(201)
      .json(successResponse(comment, 'Comment added successfully'));
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
    // req.user is guaranteed to exist because of authenticate middleware
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const requesterId = req.user!.userId;

    const comments = await CommentService.listComments(articleId, requesterId);

    res
      .status(200)
      .json(successResponse(comments, 'Comments retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const update = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { commentId } = req.params;
    // req.user is guaranteed to exist because of authenticate middleware
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const userId = req.user!.userId;
    const body = req.body.body as string | undefined;

    const comment = await CommentService.updateComment(commentId, userId, body);

    res
      .status(200)
      .json(successResponse(comment, 'Comment updated successfully'));
  } catch (error) {
    next(error);
  }
};

const remove = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { commentId } = req.params;
    // req.user is guaranteed to exist because of authenticate middleware
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const userId = req.user!.userId;

    await CommentService.deleteComment(commentId, userId);

    res.status(200).json(successResponse(null, 'Comment deleted successfully'));
  } catch (error) {
    next(error);
  }
};

export default { create, list, update, remove };
