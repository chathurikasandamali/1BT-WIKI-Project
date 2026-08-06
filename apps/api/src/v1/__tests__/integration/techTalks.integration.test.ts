import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';

await jest.unstable_mockModule('@repo/db', () => ({
  prisma: {
    techTalk: {
      create: jest.fn(),
      update: jest.fn(),
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

const mockTechTalkRepository = {
  create: jest.fn<any>().mockResolvedValue({}),
  findById: jest.fn<any>().mockResolvedValue(null),
  updateStatus: jest.fn<any>().mockResolvedValue({}),
  update: jest.fn<any>().mockResolvedValue({}),
};

await jest.unstable_mockModule('@repositories/techTalkRepository.js', () => ({
  default: mockTechTalkRepository,
  TechTalkRepository: jest.fn().mockImplementation(() => mockTechTalkRepository),
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

    mockTechTalkRepository.create.mockResolvedValue(expectedResponse as any);

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

describe('POST /api/v1/techTalks/:id/publish - Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const publishPath = (id: string) => `/api/v1/techTalks/${id}/publish`;

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).post(publishPath('tt-1'));
    expect(res.status).toBe(401);
  });

  it('returns 403 when authenticated as non-Admin (e.g. Employee)', async () => {
    const res = await request(app)
      .post(publishPath('tt-1'))
      .set('x-test-user-id', 'emp-1')
      .set('x-test-user-email', 'employee@test.com')
      .set('x-test-user-role', 'Employee');

    expect(res.status).toBe(403);
  });

  it('returns 404 when tech talk is not found', async () => {
    mockTechTalkRepository.findById.mockResolvedValue(null);

    const res = await request(app)
      .post(publishPath('non-existent-id'))
      .set('x-test-user-id', 'admin-1')
      .set('x-test-user-email', 'admin@test.com')
      .set('x-test-user-role', 'Admin');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Tech Talk not found');
  });

  it('returns 400 when tech talk status is already published', async () => {
    mockTechTalkRepository.findById.mockResolvedValue({
      id: 'tt-1',
      status: 'published',
    });

    const res = await request(app)
      .post(publishPath('tt-1'))
      .set('x-test-user-id', 'admin-1')
      .set('x-test-user-email', 'admin@test.com')
      .set('x-test-user-role', 'Admin');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe(
      'Cannot publish a Tech Talk with status "published". Only Draft Tech Talks can be published.'
    );
  });

  it('returns 400 when tech talk status is unpublished', async () => {
    mockTechTalkRepository.findById.mockResolvedValue({
      id: 'tt-1',
      status: 'unpublished',
    });

    const res = await request(app)
      .post(publishPath('tt-1'))
      .set('x-test-user-id', 'admin-1')
      .set('x-test-user-email', 'admin@test.com')
      .set('x-test-user-role', 'Admin');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe(
      'Cannot publish a Tech Talk with status "unpublished". Only Draft Tech Talks can be published.'
    );
  });

  it('returns 200 for Admin publishing a Draft tech talk', async () => {
    const draftTalk = {
      id: 'tt-draft-1',
      title: 'Draft Talk',
      status: 'draft',
    };
    const publishedTalk = {
      ...draftTalk,
      status: 'published',
    };

    mockTechTalkRepository.findById.mockResolvedValue(draftTalk);
    mockTechTalkRepository.updateStatus.mockResolvedValue(publishedTalk);

    const res = await request(app)
      .post(publishPath('tt-draft-1'))
      .set('x-test-user-id', 'admin-1')
      .set('x-test-user-email', 'admin@test.com')
      .set('x-test-user-role', 'Admin');

    expect(res.status).toBe(200);
    expect(mockTechTalkRepository.findById).toHaveBeenCalledWith('tt-draft-1');
    expect(mockTechTalkRepository.updateStatus).toHaveBeenCalledWith(
      'tt-draft-1',
      'published'
    );
    expect(res.body).toEqual({
      success: true,
      data: publishedTalk,
      message: 'Tech Talk published successfully',
    });
  });
});

describe('PATCH /api/v1/techTalks/:id - Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const patchPath = (id: string) => `/api/v1/techTalks/${id}`;

  const publishedTechTalk = {
    id: 'tt-pub-1',
    title: 'Original Title',
    description: 'Original description',
    presenters: ['Alice'],
    tags: ['React'],
    eventDate: '2026-06-01T10:00:00.000Z',
    slidesUrl: null,
    youtubeVideoId: null,
    status: 'published',
    createdBy: 'admin-1',
    deletedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app)
      .patch(patchPath('tt-pub-1'))
      .field('data', JSON.stringify({ title: 'New' }));

    expect(res.status).toBe(401);
  });

  it('returns 403 when authenticated as non-Admin', async () => {
    const res = await request(app)
      .patch(patchPath('tt-pub-1'))
      .set('x-test-user-id', 'emp-1')
      .set('x-test-user-email', 'employee@test.com')
      .set('x-test-user-role', 'Employee')
      .field('data', JSON.stringify({ title: 'New' }));

    expect(res.status).toBe(403);
  });

  it('returns 404 when tech talk does not exist', async () => {
    mockTechTalkRepository.findById.mockResolvedValue(null);

    const res = await request(app)
      .patch(patchPath('non-existent-id'))
      .set('x-test-user-id', 'admin-1')
      .set('x-test-user-email', 'admin@test.com')
      .set('x-test-user-role', 'Admin')
      .field('data', JSON.stringify({ title: 'New' }));

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Tech Talk not found');
  });

  it('returns 400 for invalid fields (empty title)', async () => {
    mockTechTalkRepository.findById.mockResolvedValue(publishedTechTalk);

    const res = await request(app)
      .patch(patchPath('tt-pub-1'))
      .set('x-test-user-id', 'admin-1')
      .set('x-test-user-email', 'admin@test.com')
      .set('x-test-user-role', 'Admin')
      .field('data', JSON.stringify({ title: '' }));

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Title is required');
  });

  it('returns 200 for Admin editing a Published Tech Talk and confirms status resets to draft', async () => {
    const updatedTalk = {
      ...publishedTechTalk,
      title: 'Updated Title',
      status: 'draft',
    };

    mockTechTalkRepository.findById.mockResolvedValue(publishedTechTalk);
    mockTechTalkRepository.update.mockResolvedValue(updatedTalk);

    const res = await request(app)
      .patch(patchPath('tt-pub-1'))
      .set('x-test-user-id', 'admin-1')
      .set('x-test-user-email', 'admin@test.com')
      .set('x-test-user-role', 'Admin')
      .field('data', JSON.stringify({ title: 'Updated Title' }));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('draft');
    expect(res.body.message).toBe('Tech Talk updated successfully');
    expect(mockTechTalkRepository.update).toHaveBeenCalledWith(
      'tt-pub-1',
      expect.objectContaining({ title: 'Updated Title', status: 'draft' })
    );
  });
});

