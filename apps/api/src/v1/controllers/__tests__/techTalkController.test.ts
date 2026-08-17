import { jest } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';
import type { TechTalkService } from '@services/techTalkService.js';
import { AppError } from '@errors/AppError.js';
import { makeMockReqResNext } from '@v1/__tests__/helpers/mockExpress.helpers.js';
import { createTechTalk } from '@repo/shared';
import { HttpStatusCode } from '@/v1/utils/httpStatus.js';

jest.unstable_mockModule('@services/techTalkService.js', () => ({
  TechTalkService: jest.fn(),
  techTalkService: {},
}));

const { TechTalkController } = await import('../techTalkController.js');

const makeMockService = (): jest.Mocked<
  Pick<TechTalkService, 'createTechTalk' | 'publishTechTalk' | 'unpublishTechTalk' | 'updateTechTalk' | 'listPublished' | 'listAll' | 'getTechTalkById' | 'deleteTechTalk'>
> => ({
  createTechTalk: jest.fn(),
  publishTechTalk: jest.fn(),
  unpublishTechTalk: jest.fn(),
  updateTechTalk: jest.fn(),
  listPublished: jest.fn(),
  listAll: jest.fn(),
  getTechTalkById: jest.fn(),
  deleteTechTalk: jest.fn(),
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

  describe('listPublished', () => {
    it('should parse query parameters and call service.listPublished', async () => {
      req.query = {
        page: '2',
        limit: '10',
        search: 'Architecture',
        sort: 'title',
        order: 'asc',
      };
      const mockResult = {
        techTalks: [],
        total: 0,
        page: 2,
        limit: 10,
      };
      mockService.listPublished.mockResolvedValue(mockResult as any);

      await controller.listPublished(req as Request, res as Response, next);

      expect(mockService.listPublished).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
        search: 'Architecture',
        sort: 'title',
        order: 'asc',
      });
      expect(res.status).toHaveBeenCalledWith(HttpStatusCode.OK);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
        message: 'Tech Talks retrieved successfully',
      });
    });

    it('should fallback to default page 1 and limit 20 when non-numeric query params provided', async () => {
      req.query = {};
      const mockResult = { techTalks: [], total: 0, page: 1, limit: 20 };
      mockService.listPublished.mockResolvedValue(mockResult as any);

      await controller.listPublished(req as Request, res as Response, next);

      expect(mockService.listPublished).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        search: undefined,
        sort: undefined,
        order: undefined,
      });
    });

    it('should forward service errors to next', async () => {
      req.query = { sort: 'invalid' };
      const error = new AppError('Invalid sort field', HttpStatusCode.BAD_REQUEST);
      mockService.listPublished.mockRejectedValue(error);

      await controller.listPublished(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('listAll', () => {
    it('should parse query parameters and call service.listAll', async () => {
      req.query = {
        page: '2',
        limit: '10',
        search: 'Architecture',
        sort: 'title',
        order: 'asc',
      };
      const mockResult = {
        techTalks: [],
        total: 0,
        page: 2,
        limit: 10,
      };
      mockService.listAll.mockResolvedValue(mockResult as any);

      await controller.listAll(req as Request, res as Response, next);

      expect(mockService.listAll).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
        search: 'Architecture',
        sort: 'title',
        order: 'asc',
      });
      expect(res.status).toHaveBeenCalledWith(HttpStatusCode.OK);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
        message: 'Tech Talks retrieved successfully',
      });
    });

    it('should fallback to default page 1 and limit 20 when non-numeric query params provided', async () => {
      req.query = {};
      const mockResult = { techTalks: [], total: 0, page: 1, limit: 20 };
      mockService.listAll.mockResolvedValue(mockResult as any);

      await controller.listAll(req as Request, res as Response, next);

      expect(mockService.listAll).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        search: undefined,
        sort: undefined,
        order: undefined,
      });
    });

    it('should forward service errors to next', async () => {
      req.query = { sort: 'invalid' };
      const error = new AppError('Invalid sort field', HttpStatusCode.BAD_REQUEST);
      mockService.listAll.mockRejectedValue(error);

      await controller.listAll(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
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

      const expectedCreated = createTechTalk({
        id: 'tt-1',
        ...input,
        createdBy: 'admin-123',
      });
      mockService.createTechTalk.mockResolvedValue(expectedCreated as any);

      await controller.create(req as Request, res as Response, next);

      expect(mockService.createTechTalk).toHaveBeenCalledWith(input, 'admin-123', slideFile);
      expect(res.status).toHaveBeenCalledWith(HttpStatusCode.CREATED);
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
      const publishedTalk = createTechTalk({
        id: 'tt-123',
        title: 'Tech Talk 1',
      });
      mockService.publishTechTalk.mockResolvedValue(publishedTalk as any);

      await controller.publish(req as Request, res as Response, next);

      expect(mockService.publishTechTalk).toHaveBeenCalledWith('tt-123');
      expect(res.status).toHaveBeenCalledWith(HttpStatusCode.OK);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: publishedTalk,
        message: 'Tech Talk published successfully',
      });
    });

    it('should forward errors to next', async () => {
      req.params = { id: 'tt-invalid' };
      const error = new AppError('Tech Talk not found', HttpStatusCode.NOT_FOUND);
      mockService.publishTechTalk.mockRejectedValue(error);

      await controller.publish(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('unpublish', () => {
    it('should call service.unpublishTechTalk with id and return 200 on success', async () => {
      req.params = { id: 'tt-123' };
      const unpublishedTalk = createTechTalk({
        id: 'tt-123',
        title: 'Tech Talk 1',
        status: 'unpublished',
      });
      mockService.unpublishTechTalk.mockResolvedValue(unpublishedTalk as any);

      await controller.unpublish(req as Request, res as Response, next);

      expect(mockService.unpublishTechTalk).toHaveBeenCalledWith('tt-123');
      expect(res.status).toHaveBeenCalledWith(HttpStatusCode.OK);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: unpublishedTalk,
        message: 'Tech Talk unpublished successfully',
      });
    });

    it('should forward errors to next', async () => {
      req.params = { id: 'tt-invalid' };
      const error = new AppError('Tech Talk not found', HttpStatusCode.NOT_FOUND);
      mockService.unpublishTechTalk.mockRejectedValue(error);

      await controller.unpublish(req as Request, res as Response, next);

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

      const updatedTalk = createTechTalk({
        id: 'tt-42',
        ...input,
        status: 'draft',
      });
      mockService.updateTechTalk.mockResolvedValue(updatedTalk as any);

      await controller.update(req as Request, res as Response, next);

      expect(mockService.updateTechTalk).toHaveBeenCalledWith('tt-42', input, slidesFile);
      expect(res.status).toHaveBeenCalledWith(HttpStatusCode.OK);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: updatedTalk,
        message: 'Tech Talk updated successfully',
      });
    });

    it('should forward service errors to next', async () => {
      req.params = { id: 'tt-99' };
      req.body = { data: JSON.stringify({ title: 'X' }) };
      const error = new AppError('Tech Talk not found', HttpStatusCode.NOT_FOUND);
      mockService.updateTechTalk.mockRejectedValue(error);

      await controller.update(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getById', () => {
    it('should call service.getTechTalkById with id and req.user.role, and return 200', async () => {
      req.params = { id: 'tt-123' };
      req.user = { userId: 'u-1', email: 'user@test.com', role: 'User' };
      const mockTalk = createTechTalk({
        id: 'tt-123',
        title: 'Tech Talk Detail',
      });
      mockService.getTechTalkById.mockResolvedValue(mockTalk as any);

      await controller.getById(req as Request, res as Response, next);

      expect(mockService.getTechTalkById).toHaveBeenCalledWith('tt-123', 'User');
      expect(res.status).toHaveBeenCalledWith(HttpStatusCode.OK);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockTalk,
        message: 'Tech Talk retrieved successfully',
      });
    });

    it('should forward service errors to next', async () => {
      req.params = { id: 'tt-999' };
      req.user = { userId: 'u-1', email: 'user@test.com', role: 'User' };
      const error = new AppError('Tech Talk not found', HttpStatusCode.NOT_FOUND);
      mockService.getTechTalkById.mockRejectedValue(error);

      await controller.getById(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('deleteTechTalk', () => {
    it('should call service.deleteTechTalk with id and return 200 with data null', async () => {
      req.params = { id: 'tt-123' };
      mockService.deleteTechTalk.mockResolvedValue(undefined);

      await controller.deleteTechTalk(req as Request, res as Response, next);

      expect(mockService.deleteTechTalk).toHaveBeenCalledWith('tt-123');
      expect(res.status).toHaveBeenCalledWith(HttpStatusCode.OK);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: null,
        message: 'Tech Talk deleted successfully',
      });
    });

    it('should forward service errors to next', async () => {
      req.params = { id: 'tt-999' };
      const error = new AppError('Tech Talk not found', HttpStatusCode.NOT_FOUND);
      mockService.deleteTechTalk.mockRejectedValue(error);

      await controller.deleteTechTalk(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
