import type { Request, Response, NextFunction } from 'express';
import { ArticleService } from '@services/articleService.js';
import { successResponse } from '@models/article.types.js';
import type { CreateArticleInput } from '@models/article.types.js';
import type { UserRole } from '@/types/userTypes.js';
import { AppError } from '@errors/AppError.js';
import { HttpStatusCode } from '@utils/httpStatus.js';
import { DEFAULT_PAGE, DEFAULT_PAGE_LIMIT } from '@repo/shared';

export class ArticleController {
  constructor(private service: ArticleService = new ArticleService()) {}

  create = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.body.data) {
        throw new AppError('The "data" field is required', 400);
      }

      let input: CreateArticleInput;
      try {
        input = JSON.parse(req.body.data) as CreateArticleInput;
      } catch (e) {
        throw new AppError('Invalid JSON in "data" field', 400);
      }

      // req.user is guaranteed to exist because of authenticate middleware
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const authorId = req.user!.userId;
      const images = (req.files as Express.Multer.File[]) ?? [];

      const article = await this.service.createArticle(input, authorId, images);

      res
        .status(201)
        .json(successResponse(article, 'Article created successfully'));
    } catch (error) {
      next(error);
    }
  };

  update = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const authorId = req.user!.userId;

      let input = {};
      if (req.body.data) {
        try {
          input = JSON.parse(req.body.data);
        } catch (e) {
          throw new AppError('Invalid JSON in "data" field', 400);
        }
      }

      const images = (req.files as Express.Multer.File[]) ?? [];

      const article = await this.service.updateArticle(
        id,
        input,
        authorId,
        images
      );

      res
        .status(200)
        .json(successResponse(article, 'Article updated successfully'));
    } catch (error) {
      next(error);
    }
  };

  submitForReview = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const authorId = req.user!.userId;

      const article = await this.service.submitForReview(id, authorId);

      res
        .status(200)
        .json(successResponse(article, 'Article submitted for review'));
    } catch (error) {
      next(error);
    }
  };

  publishArticle = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const callerRole = req.user!.role as UserRole;

      const article = await this.service.publishArticle(id, callerRole);
      res
        .status(HttpStatusCode.OK)
        .json(successResponse(article, 'Article published successfully.'));
    } catch (error) {
      next(error);
    }
  };

  listPublished = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string, 10) || DEFAULT_PAGE;
      const limit = parseInt(req.query.limit as string, 10) || DEFAULT_PAGE_LIMIT;
      const search = req.query.search as string | undefined;
      const sort = req.query.sort as string | undefined;
      const order = req.query.order as string | undefined;

      const result = await this.service.listPublished(page, limit, search, sort, order);

      res
        .status(200)
        .json(successResponse(result, 'Articles retrieved successfully'));
    } catch (error) {
      next(error);
    }
  };

  listAllArticles = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const page = Number(req.query.page) || DEFAULT_PAGE;
      const limit = Number(req.query.limit) || DEFAULT_PAGE_LIMIT;
      const status = req.query.status as string | undefined;
      const search = req.query.search as string | undefined;
      const sort = req.query.sort as string | undefined;
      const order = req.query.order as string | undefined;

      const result = await this.service.listAllArticles(
        page,
        limit,
        status,
        search,
        sort,
        order
      );

      res
        .status(200)
        .json(successResponse(result, 'Articles retrieved successfully'));
    } catch (error) {
      next(error);
    }
  };

  getById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const requesterId = req.user?.userId ?? null;
      const role = (req.user?.role as UserRole | undefined) ?? null;

      const article = await this.service.getArticleById(id, requesterId, role);

      res
        .status(200)
        .json(successResponse(article, 'Article retrieved successfully'));
    } catch (error) {
      next(error);
    }
  };

  remove = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const role = req.user!.role as UserRole;
      const hard = req.query.hard === 'true';
      await this.service.deleteArticle(id, userId, role, hard);
      res.status(200).json({
        success: true,
        data: null,
        message: 'Article deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  listMine = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const authorId = req.user!.userId;
      const page = parseInt(req.query.page as string, 10) || DEFAULT_PAGE;
      const limit = parseInt(req.query.limit as string, 10) || DEFAULT_PAGE_LIMIT;

      const result = await this.service.listMine(authorId, page, limit);

      res
        .status(200)
        .json(successResponse(result, 'Articles retrieved successfully'));
    } catch (error) {
      next(error);
    }
  };
}

export default ArticleController;
