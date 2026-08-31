import type { Request, Response, NextFunction } from 'express';
import CommentService from '@services/commentService.js';
import { successResponse } from '@models/article.types.js';
import { DEFAULT_PAGE, DEFAULT_PAGE_LIMIT } from '@repo/shared';

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

const listPending = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Number(req.query.page) || DEFAULT_PAGE;
    const limit = Number(req.query.limit) || DEFAULT_PAGE_LIMIT;

    const result = await CommentService.listPendingComments(page, limit);

    res
      .status(200)
      .json(successResponse(result, 'Pending comments retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

const approve = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { commentId } = req.params;
    // req.user is guaranteed to exist because of authenticate middleware
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const reviewerId = req.user!.userId;

    const comment = await CommentService.approveComment(commentId, reviewerId);

    res.status(200).json(successResponse(comment, 'Comment approved'));
  } catch (error) {
    next(error);
  }
};

const reject = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { commentId } = req.params;
    // req.user is guaranteed to exist because of authenticate middleware
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const reviewerId = req.user!.userId;

    const comment = await CommentService.rejectComment(commentId, reviewerId);

    res.status(200).json(successResponse(comment, 'Comment rejected'));
  } catch (error) {
    next(error);
  }
};

export default { create, list, update, remove, listPending, approve, reject };
