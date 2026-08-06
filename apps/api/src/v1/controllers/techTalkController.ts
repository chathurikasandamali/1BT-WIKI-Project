import type { Request, Response, NextFunction } from 'express';
import { AppError } from '@errors/AppError.js';
import { TechTalkService } from '../services/techTalkService.js';
import type { CreateTechTalkInput, UpdateTechTalkInput } from '@models/techTalk.types.js';

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

  publish = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const techTalk = await this.service.publishTechTalk(id);
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
      const techTalk = await this.service.updateTechTalk(id, input, slidesFile);
      res.status(200).json({ success: true, data: techTalk, message: 'Tech Talk updated successfully' });
    } catch (error) {
      next(error);
    }
  };
}
