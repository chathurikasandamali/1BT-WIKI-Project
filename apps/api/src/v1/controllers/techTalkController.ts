import type { Request, Response, NextFunction } from 'express';
import { AppError } from '@errors/AppError.js';
import {
  TechTalkService,
  techTalkService as techTalkServiceInstance,
} from '@services/techTalkService.js';
import type { CreateTechTalkInput, UpdateTechTalkInput } from '@models/techTalk.types.js';
import { TechTalkListQuery } from '@models/techTalk.types.js';

export class TechTalkController {
  constructor(
    private techTalkService: TechTalkService = techTalkServiceInstance
) {}

  listPublished = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const query: TechTalkListQuery = {
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
        search: req.query.search as string | undefined,
        sort: req.query.sort as string | undefined,
        order: req.query.order as string | undefined,
      };
      const result = await this.techTalkService.listPublished(query);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Tech Talks retrieved successfully',
      });
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
      const requesterRole = req.user?.role;
      const techTalk = await this.techTalkService.getTechTalkById(id, requesterRole);
      res.status(200).json({
        success: true,
        data: techTalk,
        message: 'Tech Talk retrieved successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  create = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.body.data) {
        throw new AppError('The "data" field is required', 400);
      }
      let input: CreateTechTalkInput;
      try {
        input = JSON.parse(req.body.data);
      } catch {
        throw new AppError('Invalid JSON in "data" field', 400);
      }
      const adminId = req.user!.userId;
      const slidesFile = (req.files as Express.Multer.File[])?.[0];
      const techTalk = await this.techTalkService.createTechTalk(
        input,
        adminId,
        slidesFile
      );
      res.status(201).json({
        success: true,
        data: techTalk,
        message: 'Tech Talk created successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  publish = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const techTalk = await this.techTalkService.publishTechTalk(id);
      res.status(200).json({
        success: true,
        data: techTalk,
        message: 'Tech Talk published successfully',
      });
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
      if (!req.body.data) throw new AppError('The "data" field is required', 400);
      let input: UpdateTechTalkInput;
      try {
        input = JSON.parse(req.body.data);
      } catch {
        throw new AppError('Invalid JSON in "data" field', 400);
      }
      const slidesFile = (req.files as Express.Multer.File[])?.[0];
      const techTalk = await this.techTalkService.updateTechTalk(id, input, slidesFile);
      res.status(200).json({ success: true, data: techTalk, message: 'Tech Talk updated successfully' });
    } catch (error) {
      next(error);
    }
  };
}
