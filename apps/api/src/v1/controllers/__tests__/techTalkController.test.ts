import { jest } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';
import type { TechTalkService } from '@services/techTalkService.js';
import { AppError } from '@errors/AppError.js';
import { makeMockReqResNext } from '@v1/__tests__/helpers/mockExpress.helpers.js';

jest.unstable_mockModule('@services/techTalkService.js', () => ({
  TechTalkService: jest.fn(),
}));

const { TechTalkController } = await import('../techTalkController.js');

const makeMockService = (): jest.Mocked<Pick<TechTalkService, 'createTechTalk' | 'publishTechTalk' | 'updateTechTalk'>> => ({
  createTechTalk: jest.fn(),
  publishTechTalk: jest.fn(),
  updateTechTalk: jest.fn(),
});

describe('TechTalkController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock<any>;
  let mockService: ReturnType<typeof makeMockService>;
  let controller: InstanceType<typeof TechTalkController>;

  beforeEach(() => {
    ({ req, res, next } = makeMockReqResNext());
    mockService = makeMockService();
    controller = new TechTalkController(mockService as unknown as TechTalkService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should throw AppError if data field is missing', async () => {
      req.body = {};
      await controller.create(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect((next.mock.calls[0][0] as AppError).message).toBe('The "data" field is required');
    });

    it('should throw AppError if data JSON is invalid', async () => {
      req.body = { data: 'invalid-json' };
      await controller.create(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect((next.mock.calls[0][0] as AppError).message).toBe('Invalid JSON in "data" field');
    });

    it('should parse data & slides file and return 201 on success', async () => {
      const input = {
        title: 'Tech Talk 1',
        presenters: ['Presenter A'],
        eventDate: '2026-09-01T10:00:00.000Z',
      };
      req.body = { data: JSON.stringify(input) };
      req.user = { userId: 'admin-123', email: 'admin@test.com', role: 'Admin' };
      const slideFile = { originalname: 'slides.pdf' } as Express.Multer.File;
      req.files = [slideFile];

      const expectedCreated = { id: 'tt-1', ...input, createdBy: 'admin-123' };
      mockService.createTechTalk.mockResolvedValue(expectedCreated as any);

      await controller.create(req as Request, res as Response, next);

      expect(mockService.createTechTalk).toHaveBeenCalledWith(input, 'admin-123', slideFile);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expectedCreated,
        message: 'Tech Talk created successfully',
      });
    });
  });

  describe('publish', () => {
    it('should call service.publishTechTalk with id and return 200 on success', async () => {
      req.params = { id: 'tt-123' };
      const publishedTalk = { id: 'tt-123', status: 'published', title: 'Tech Talk 1' };
      mockService.publishTechTalk.mockResolvedValue(publishedTalk as any);

      await controller.publish(req as Request, res as Response, next);

      expect(mockService.publishTechTalk).toHaveBeenCalledWith('tt-123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: publishedTalk,
        message: 'Tech Talk published successfully',
      });
    });

    it('should forward errors to next', async () => {
      req.params = { id: 'tt-invalid' };
      const error = new AppError('Tech Talk not found', 404);
      mockService.publishTechTalk.mockRejectedValue(error);

      await controller.publish(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('update', () => {
    it('should throw AppError if data field is missing', async () => {
      req.params = { id: 'tt-1' };
      req.body = {};
      await controller.update(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect((next.mock.calls[0][0] as AppError).message).toBe('The "data" field is required');
    });

    it('should throw AppError if data JSON is invalid', async () => {
      req.params = { id: 'tt-1' };
      req.body = { data: '{bad json' };
      await controller.update(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect((next.mock.calls[0][0] as AppError).message).toBe('Invalid JSON in "data" field');
    });

    it('should parse multipart data + file, call service.updateTechTalk, and return 200', async () => {
      const input = { title: 'Updated Title', tags: ['Node'] };
      req.params = { id: 'tt-42' };
      req.body = { data: JSON.stringify(input) };
      const slidesFile = { originalname: 'updated.pdf' } as Express.Multer.File;
      req.files = [slidesFile];

      const updatedTalk = { id: 'tt-42', ...input, status: 'draft' };
      mockService.updateTechTalk.mockResolvedValue(updatedTalk as any);

      await controller.update(req as Request, res as Response, next);

      expect(mockService.updateTechTalk).toHaveBeenCalledWith('tt-42', input, slidesFile);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: updatedTalk,
        message: 'Tech Talk updated successfully',
      });
    });

    it('should forward service errors to next', async () => {
      req.params = { id: 'tt-99' };
      req.body = { data: JSON.stringify({ title: 'X' }) };
      const error = new AppError('Tech Talk not found', 404);
      mockService.updateTechTalk.mockRejectedValue(error);

      await controller.update(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
