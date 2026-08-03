import type { Request, Response, NextFunction } from 'express';
import { AppError } from '@errors/AppError.js';
import { TechTalkService } from '../services/techTalkService.js';
import type { CreateTechTalkInput } from '@models/techTalk.types.js';

export class TechTalkController {
  constructor(private service: TechTalkService = new TechTalkService()) {}

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
      const techTalk = await this.service.createTechTalk(
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
}
