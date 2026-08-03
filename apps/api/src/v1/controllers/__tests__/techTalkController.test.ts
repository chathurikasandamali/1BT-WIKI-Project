import { jest } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';
import type { TechTalkService } from '@services/techTalkService.js';
import { AppError } from '@errors/AppError.js';
import { makeMockReqResNext } from '@v1/__tests__/helpers/mockExpress.helpers.js';

jest.unstable_mockModule('@services/techTalkService.js', () => ({
  TechTalkService: jest.fn(),
}));

const { TechTalkController } = await import('../techTalkController.js');

const makeMockService = (): jest.Mocked<Pick<TechTalkService, 'createTechTalk'>> => ({
  createTechTalk: jest.fn(),
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
});
