import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';

await jest.unstable_mockModule('@repo/db', () => ({
  prisma: {
    techTalk: {
      create: jest.fn(),
    },
  },
}));

await jest.unstable_mockModule('@middleware/auth.middleware.js', () => ({
  authenticate: jest.fn(
    async (
      req: import('express').Request,
      res: import('express').Response,
      next: import('express').NextFunction
    ) => {
      const userId = req.headers['x-test-user-id'] as string | undefined;
      const email = req.headers['x-test-user-email'] as string | undefined;
      const role = req.headers['x-test-user-role'] as string | undefined;

      if (userId && email && role) {
        req.user = { userId, email, role };
        next();
        return;
      }

      res
        .status(401)
        .json({ success: false, error: 'Authentication required' });
    }
  ),
  requireRole: (allowedRole: string) =>
    (
      req: import('express').Request,
      res: import('express').Response,
      next: import('express').NextFunction
    ) => {
      if (req.user?.role !== allowedRole) {
        res.status(403).json({ success: false, error: 'Access denied' });
        return;
      }
      next();
    },
}));

const MockTechTalkRepository = {
  create: jest.fn<() => Promise<unknown>>().mockResolvedValue({}),
};

await jest.unstable_mockModule('@repositories/techTalkRepository.js', () => ({
  default: MockTechTalkRepository,
  TechTalkRepository: jest.fn().mockImplementation(() => MockTechTalkRepository),
}));

await jest.unstable_mockModule('@v1/lib/b2Client.js', () => ({
  default: {
    uploadFile: jest.fn(),
  },
}));

const { default: app } = await import('@/app.js');

describe('POST /api/v1/techTalks - Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const validData = {
    title: 'Vue vs React',
    presenters: ['Charlie'],
    tags: ['Frontend', 'JavaScript'],
    eventDate: '2026-10-15T14:00:00.000Z',
    youtubeVideoId: 'dQw4w9WgXcQ',
  };
  const techtalkPath = `/api/v1/techTalks`;

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app)
      .post(techtalkPath)
      .field('data', JSON.stringify(validData));

    expect(res.status).toBe(401);
  });

  it('returns 403 when authenticated as non-Admin (e.g. Employee)', async () => {
    const res = await request(app)
      .post(techtalkPath)
      .set('x-test-user-id', 'emp-1')
      .set('x-test-user-email', 'employee@test.com')
      .set('x-test-user-role', 'Employee')
      .field('data', JSON.stringify(validData));

    expect(res.status).toBe(403);
  });

  it('returns 400 when required fields are missing', async () => {
    const invalidData = { presenters: ['Charlie'] };

    const res = await request(app)
      .post(techtalkPath)
      .set('x-test-user-id', 'admin-1')
      .set('x-test-user-email', 'admin@test.com')
      .set('x-test-user-role', 'Admin')
      .field('data', JSON.stringify(invalidData));

    expect(res.status).toBe(400);
  });

  it('returns 400 when a full URL is passed instead of video ID', async () => {
    const fullUrlData = {
      ...validData,
      youtubeVideoId: 'https://youtube.com/embed/dQw4w9WgXcQ',
    };

    const res = await request(app)
      .post(techtalkPath)
      .set('x-test-user-id', 'admin-1')
      .set('x-test-user-email', 'admin@test.com')
      .set('x-test-user-role', 'Admin')
      .field('data', JSON.stringify(fullUrlData));

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid YouTube video ID');
  });

  it('returns 201 for Admin with valid payload including tags', async () => {
    const expectedResponse = {
      id: 'tt-uuid-1',
      title: 'Vue vs React',
      description: null,
      presenters: ['Charlie'],
      tags: ['Frontend', 'JavaScript'],
      eventDate: '2026-10-15T14:00:00.000Z',
      slidesUrl: null,
      youtubeVideoId: 'dQw4w9WgXcQ',
      status: 'draft',
      createdBy: 'admin-1',
    };

    MockTechTalkRepository.create.mockResolvedValue(expectedResponse as any);

    const res = await request(app)
      .post(techtalkPath)
      .set('x-test-user-id', 'admin-1')
      .set('x-test-user-email', 'admin@test.com')
      .set('x-test-user-role', 'Admin')
      .field('data', JSON.stringify(validData));

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      success: true,
      data: expectedResponse,
      message: 'Tech Talk created successfully',
    });
  });
});
