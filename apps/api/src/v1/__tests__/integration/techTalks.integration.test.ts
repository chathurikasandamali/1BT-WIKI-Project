import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import { HttpStatusCode } from '@/v1/utils/httpStatus.js';
import { createTechTalk } from '@v1/__tests__/helpers/techTalk.fixtures.js';

await jest.unstable_mockModule('@repo/db', () => ({
  TechTalkStatus: {
    draft: 'draft',
    published: 'published',
    unpublished: 'unpublished',
  },
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
        .status(HttpStatusCode.UNAUTHORIZED)
        .json({ success: false, error: 'Authentication required' });
    }
  ),
  requireRole:
    (allowedRole: string) =>
    (
      req: import('express').Request,
      res: import('express').Response,
      next: import('express').NextFunction
    ) => {
      if (req.user?.role !== allowedRole) {
        res
          .status(HttpStatusCode.FORBIDDEN)
          .json({ success: false, error: 'Access denied' });
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
  findPublished: jest.fn<any>().mockResolvedValue({ techTalks: [], total: 0 }),
  listAll: jest.fn<any>().mockResolvedValue({ techTalks: [], total: 0 }),
  unpublish: jest.fn<any>().mockResolvedValue({}),
  softDelete: jest.fn<any>().mockResolvedValue({}),
};

await jest.unstable_mockModule('@repositories/techTalkRepository.js', () => ({
  default: mockTechTalkRepository,
  techTalkRepository: mockTechTalkRepository,
  TechTalkRepository: jest
    .fn()
    .mockImplementation(() => mockTechTalkRepository),
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

    expect(res.status).toBe(HttpStatusCode.UNAUTHORIZED);
  });

  it('returns 403 when authenticated as non-Admin (e.g. Employee)', async () => {
    const res = await request(app)
      .post(techtalkPath)
      .set('x-test-user-id', 'emp-1')
      .set('x-test-user-email', 'employee@test.com')
      .set('x-test-user-role', 'Employee')
      .field('data', JSON.stringify(validData));

    expect(res.status).toBe(HttpStatusCode.FORBIDDEN);
  });

  it('returns 400 when required fields are missing', async () => {
    const invalidData = { presenters: ['Charlie'] };

    const res = await request(app)
      .post(techtalkPath)
      .set('x-test-user-id', 'admin-1')
      .set('x-test-user-email', 'admin@test.com')
      .set('x-test-user-role', 'Admin')
      .field('data', JSON.stringify(invalidData));

    expect(res.status).toBe(HttpStatusCode.BAD_REQUEST);
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

    expect(res.status).toBe(HttpStatusCode.BAD_REQUEST);
    expect(res.body.error).toBe('Invalid YouTube video ID');
  });

  it('returns 201 for Admin with valid payload including tags', async () => {
    const expectedResponse = createTechTalk({
      id: 'tt-uuid-1',
      title: 'Vue vs React',
      presenters: ['Charlie'],
      tags: ['Frontend', 'JavaScript'],
      eventDate: '2026-10-15T14:00:00.000Z',
      youtubeVideoId: 'dQw4w9WgXcQ',
      status: 'draft',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    });

    mockTechTalkRepository.create.mockResolvedValue(expectedResponse as any);

    const res = await request(app)
      .post(techtalkPath)
      .set('x-test-user-id', 'admin-1')
      .set('x-test-user-email', 'admin@test.com')
      .set('x-test-user-role', 'Admin')
      .field('data', JSON.stringify(validData));

    expect(res.status).toBe(HttpStatusCode.CREATED);
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
  const techtalkPath = `/api/v1/techTalks`;

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).post(publishPath('tt-1'));
    expect(res.status).toBe(HttpStatusCode.UNAUTHORIZED);
  });

  it('returns 403 when authenticated as non-Admin (e.g. Employee)', async () => {
    const res = await request(app)
      .post(publishPath('tt-1'))
      .set('x-test-user-id', 'emp-1')
      .set('x-test-user-email', 'employee@test.com')
      .set('x-test-user-role', 'Employee');

    expect(res.status).toBe(HttpStatusCode.FORBIDDEN);
  });

  it('returns 404 when tech talk is not found', async () => {
    mockTechTalkRepository.findById.mockResolvedValue(null);

    const res = await request(app)
      .post(publishPath('non-existent-id'))
      .set('x-test-user-id', 'admin-1')
      .set('x-test-user-email', 'admin@test.com')
      .set('x-test-user-role', 'Admin');

    expect(res.status).toBe(HttpStatusCode.NOT_FOUND);
    expect(res.body.error).toBe('Tech Talk not found');
  });

  it('returns 400 when tech talk status is already published', async () => {
    mockTechTalkRepository.findById.mockResolvedValue(
      createTechTalk({ id: 'tt-1' })
    );

    const res = await request(app)
      .post(publishPath('tt-1'))
      .set('x-test-user-id', 'admin-1')
      .set('x-test-user-email', 'admin@test.com')
      .set('x-test-user-role', 'Admin');

    expect(res.status).toBe(HttpStatusCode.BAD_REQUEST);
    expect(res.body.error).toBe(
      'Cannot publish a Tech Talk with status "published". Only Draft or Unpublished Tech Talks can be published.'
    );
  });

  it('returns 200 for Admin republishing an Unpublished tech talk', async () => {
    const unpublishedTalk = createTechTalk({
      id: 'tt-unpub-1',
      title: 'Unpublished Talk',
      status: 'unpublished',
      eventDate: '2026-09-01T10:00:00.000Z',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    });
    const republishedTalk = {
      ...unpublishedTalk,
      status: 'published',
    };

    mockTechTalkRepository.findById.mockResolvedValue(unpublishedTalk);
    mockTechTalkRepository.updateStatus.mockResolvedValue(republishedTalk);

    const res = await request(app)
      .post(publishPath('tt-unpub-1'))
      .set('x-test-user-id', 'admin-1')
      .set('x-test-user-email', 'admin@test.com')
      .set('x-test-user-role', 'Admin');

    expect(res.status).toBe(HttpStatusCode.OK);
    expect(mockTechTalkRepository.findById).toHaveBeenCalledWith('tt-unpub-1');
    expect(mockTechTalkRepository.updateStatus).toHaveBeenCalledWith(
      'tt-unpub-1',
      'published'
    );
    expect(res.body).toEqual({
      success: true,
      data: republishedTalk,
      message: 'Tech Talk published successfully',
    });
  });

  it('returns 200 for Admin publishing a Draft tech talk', async () => {
    const draftTalk = createTechTalk({
      id: 'tt-draft-1',
      title: 'Draft Talk',
      status: 'draft',
      eventDate: '2026-09-01T10:00:00.000Z',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    });
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

    expect(res.status).toBe(HttpStatusCode.OK);
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

describe('POST /api/v1/techTalks/:id/unpublish - Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const unpublishPath = (id: string) => `/api/v1/techTalks/${id}/unpublish`;

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).post(unpublishPath('tt-1'));
    expect(res.status).toBe(HttpStatusCode.UNAUTHORIZED);
  });

  it('returns 403 when authenticated as non-Admin (e.g. Employee)', async () => {
    const res = await request(app)
      .post(unpublishPath('tt-1'))
      .set('x-test-user-id', 'emp-1')
      .set('x-test-user-email', 'employee@test.com')
      .set('x-test-user-role', 'Employee');

    expect(res.status).toBe(HttpStatusCode.FORBIDDEN);
  });

  it('returns 404 when tech talk is not found', async () => {
    const error = new Error('Record to update not found');
    (error as any).code = 'P2025';
    mockTechTalkRepository.unpublish.mockRejectedValue(error);

    const res = await request(app)
      .post(unpublishPath('non-existent-id'))
      .set('x-test-user-id', 'admin-1')
      .set('x-test-user-email', 'admin@test.com')
      .set('x-test-user-role', 'Admin');

    expect(res.status).toBe(HttpStatusCode.NOT_FOUND);
    expect(res.body.error).toBe('Tech Talk not found or is not published');
    expect(mockTechTalkRepository.unpublish).toHaveBeenCalledWith(
      'non-existent-id'
    );
    expect(mockTechTalkRepository.findById).not.toHaveBeenCalled();
  });

  it('returns 404 when tech talk status is a draft (conditional update matches no row)', async () => {
    const error = new Error('Record to update not found');
    (error as any).code = 'P2025';
    mockTechTalkRepository.unpublish.mockRejectedValue(error);

    const res = await request(app)
      .post(unpublishPath('tt-1'))
      .set('x-test-user-id', 'admin-1')
      .set('x-test-user-email', 'admin@test.com')
      .set('x-test-user-role', 'Admin');

    expect(res.status).toBe(HttpStatusCode.NOT_FOUND);
    expect(res.body.error).toBe('Tech Talk not found or is not published');
    expect(mockTechTalkRepository.unpublish).toHaveBeenCalledWith('tt-1');
    expect(mockTechTalkRepository.findById).not.toHaveBeenCalled();
  });

  it('returns 404 when tech talk is already unpublished (conditional update matches no row)', async () => {
    const error = new Error('Record to update not found');
    (error as any).code = 'P2025';
    mockTechTalkRepository.unpublish.mockRejectedValue(error);

    const res = await request(app)
      .post(unpublishPath('tt-1'))
      .set('x-test-user-id', 'admin-1')
      .set('x-test-user-email', 'admin@test.com')
      .set('x-test-user-role', 'Admin');

    expect(res.status).toBe(HttpStatusCode.NOT_FOUND);
    expect(res.body.error).toBe('Tech Talk not found or is not published');
    expect(mockTechTalkRepository.unpublish).toHaveBeenCalledWith('tt-1');
    expect(mockTechTalkRepository.findById).not.toHaveBeenCalled();
  });

  it('returns 200 for Admin unpublishing a Published tech talk, changing only the status', async () => {
    const publishedTalk = createTechTalk({
      id: 'tt-pub-1',
      title: 'Original Title',
      description: 'Original description',
      presenters: ['Alice'],
      tags: ['React'],
      eventDate: '2026-06-01T10:00:00.000Z',
      slidesUrl: 'https://example.com/slides.pdf',
      youtubeVideoId: 'dQw4w9WgXcQ',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    const unpublishedTalk = { ...publishedTalk, status: 'unpublished' };

    mockTechTalkRepository.unpublish.mockResolvedValue(unpublishedTalk);

    const res = await request(app)
      .post(unpublishPath('tt-pub-1'))
      .set('x-test-user-id', 'admin-1')
      .set('x-test-user-email', 'admin@test.com')
      .set('x-test-user-role', 'Admin');

    expect(res.status).toBe(HttpStatusCode.OK);
    expect(mockTechTalkRepository.unpublish).toHaveBeenCalledTimes(1);
    expect(mockTechTalkRepository.unpublish).toHaveBeenCalledWith('tt-pub-1');
    expect(mockTechTalkRepository.findById).not.toHaveBeenCalled();
    expect(mockTechTalkRepository.updateStatus).not.toHaveBeenCalled();
    expect(res.body).toEqual({
      success: true,
      data: unpublishedTalk,
      message: 'Tech Talk unpublished successfully',
    });
    expect(res.body.data.status).toBe('unpublished');
    // Other fields remain unchanged — only the status should change
    expect(res.body.data.title).toBe('Original Title');
    expect(res.body.data.description).toBe('Original description');
    expect(res.body.data.presenters).toEqual(['Alice']);
    expect(res.body.data.slidesUrl).toBe('https://example.com/slides.pdf');
    expect(res.body.data.youtubeVideoId).toBe('dQw4w9WgXcQ');
    expect(res.body.data.deletedAt).toBeNull();
  });
});

describe('PATCH /api/v1/techTalks/:id - Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const patchPath = (id: string) => `/api/v1/techTalks/${id}`;

  const publishedTechTalk = createTechTalk({
    id: 'tt-pub-1',
    title: 'Original Title',
    description: 'Original description',
    presenters: ['Alice'],
    tags: ['React'],
    eventDate: '2026-06-01T10:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app)
      .patch(patchPath('tt-pub-1'))
      .field('data', JSON.stringify({ title: 'New' }));

    expect(res.status).toBe(HttpStatusCode.UNAUTHORIZED);
  });

  it('returns 403 when authenticated as non-Admin', async () => {
    const res = await request(app)
      .patch(patchPath('tt-pub-1'))
      .set('x-test-user-id', 'emp-1')
      .set('x-test-user-email', 'employee@test.com')
      .set('x-test-user-role', 'Employee')
      .field('data', JSON.stringify({ title: 'New' }));

    expect(res.status).toBe(HttpStatusCode.FORBIDDEN);
  });

  it('returns 404 when tech talk does not exist', async () => {
    mockTechTalkRepository.findById.mockResolvedValue(null);

    const res = await request(app)
      .patch(patchPath('non-existent-id'))
      .set('x-test-user-id', 'admin-1')
      .set('x-test-user-email', 'admin@test.com')
      .set('x-test-user-role', 'Admin')
      .field('data', JSON.stringify({ title: 'New' }));

    expect(res.status).toBe(HttpStatusCode.NOT_FOUND);
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

    expect(res.status).toBe(HttpStatusCode.BAD_REQUEST);
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

    expect(res.status).toBe(HttpStatusCode.OK);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('draft');
    expect(res.body.message).toBe('Tech Talk updated successfully');
    expect(mockTechTalkRepository.update).toHaveBeenCalledWith(
      'tt-pub-1',
      expect.objectContaining({ title: 'Updated Title', status: 'draft' })
    );
  });
});

describe('GET /api/v1/techTalks - Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const getPath = `/api/v1/techTalks`;

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).get(getPath);
    expect(res.status).toBe(HttpStatusCode.UNAUTHORIZED);
  });

  it('returns 200 with published tech talks, filtered, sorted, and paginated for authenticated users', async () => {
    const publishedTalk = createTechTalk({
      id: 'tt-pub-1',
      title: 'Advanced React Patterns',
      description: 'Deep dive into React patterns',
      presenters: ['Alice'],
      tags: ['React'],
      eventDate: '2026-09-01T10:00:00.000Z',
      slidesUrl: 'https://example.com/slides.pdf',
      youtubeVideoId: 'dQw4w9WgXcQ',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    });

    mockTechTalkRepository.findPublished.mockResolvedValue({
      techTalks: [publishedTalk],
      total: 1,
    });

    const res = await request(app)
      .get(`${getPath}?search=React&sort=title&order=asc&page=1&limit=10`)
      .set('x-test-user-id', 'emp-1')
      .set('x-test-user-email', 'employee@test.com')
      .set('x-test-user-role', 'Employee');

    expect(res.status).toBe(HttpStatusCode.OK);
    expect(mockTechTalkRepository.findPublished).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      search: 'React',
      sort: 'title',
      order: 'asc',
    });
    expect(res.body).toEqual({
      success: true,
      data: {
        techTalks: [publishedTalk],
        total: 1,
        page: 1,
        limit: 10,
      },
      message: 'Tech Talks retrieved successfully',
    });
  });

  it('returns 200 with default sort when an invalid sort field is passed (permissive fallback)', async () => {
    mockTechTalkRepository.findPublished.mockResolvedValue({ techTalks: [], total: 0 });

    const res = await request(app)
      .get(`${getPath}?sort=invalidField`)
      .set('x-test-user-id', 'emp-1')
      .set('x-test-user-email', 'employee@test.com')
      .set('x-test-user-role', 'Employee');

    // Invalid sort is silently ignored — repository falls back to eventDate desc
    expect(res.status).toBe(HttpStatusCode.OK);
    expect(res.body.success).toBe(true);
    expect(mockTechTalkRepository.findPublished).toHaveBeenCalledWith(
      expect.objectContaining({ sort: 'invalidField' })
    );
  });
});

describe('GET /api/v1/techTalks/listAll - Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const adminListPath = `/api/v1/techTalks/listAll`;

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).get(adminListPath);
    expect(res.status).toBe(HttpStatusCode.UNAUTHORIZED);
  });

  it('returns 403 when authenticated as non-Admin (e.g. Employee)', async () => {
    const res = await request(app)
      .get(adminListPath)
      .set('x-test-user-id', 'emp-1')
      .set('x-test-user-email', 'employee@test.com')
      .set('x-test-user-role', 'Employee');

    expect(res.status).toBe(HttpStatusCode.FORBIDDEN);
  });

  it('returns 200 for Admin with draft, published, and unpublished tech talks, applying search/sort/pagination and total count', async () => {
    const techTalks = [
      createTechTalk({
        id: 'tt-draft-1',
        title: 'Draft Talk',
        presenters: ['Charlie'],
        tags: ['Draft'],
        eventDate: '2026-10-01T10:00:00.000Z',
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
        status: 'draft',
      }),
      createTechTalk({
        id: 'tt-pub-1',
        title: 'Published Talk',
        presenters: ['Alice'],
        tags: ['React'],
        eventDate: '2026-09-01T10:00:00.000Z',
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
      }),
      createTechTalk({
        id: 'tt-unpub-1',
        title: 'Unpublished Talk',
        presenters: ['Bob'],
        tags: ['Node'],
        eventDate: '2026-08-01T10:00:00.000Z',
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
        status: 'unpublished',
      }),
    ];

    mockTechTalkRepository.listAll.mockResolvedValue({
      techTalks,
      total: 3,
    });

    const res = await request(app)
      .get(
        `${adminListPath}?search=Talk&sort=eventDate&order=desc&page=1&limit=3`
      )
      .set('x-test-user-id', 'admin-1')
      .set('x-test-user-email', 'admin@test.com')
      .set('x-test-user-role', 'Admin');

    expect(res.status).toBe(HttpStatusCode.OK);
    expect(mockTechTalkRepository.listAll).toHaveBeenCalledWith({
      page: 1,
      limit: 3,
      search: 'Talk',
      sort: 'eventDate',
      order: 'desc',
    });
    expect(res.body).toEqual({
      success: true,
      data: {
        techTalks,
        total: 3,
        page: 1,
        limit: 3,
      },
      message: 'Tech Talks retrieved successfully',
    });
    expect(
      res.body.data.techTalks.map((talk: { status: string }) => talk.status)
    ).toEqual(['draft', 'published', 'unpublished']);
  });

  it('returns 200 for Admin with an empty list and total 0 when no non-deleted tech talks exist', async () => {
    mockTechTalkRepository.listAll.mockResolvedValue({
      techTalks: [],
      total: 0,
    });

    const res = await request(app)
      .get(adminListPath)
      .set('x-test-user-id', 'admin-1')
      .set('x-test-user-email', 'admin@test.com')
      .set('x-test-user-role', 'Admin');

    expect(res.status).toBe(HttpStatusCode.OK);
    expect(res.body.data).toEqual({
      techTalks: [],
      total: 0,
      page: 1,
      limit: 20,
    });
  });

  it('returns 200 for Admin with an invalid sort field falling back to the default sort (permissive fallback)', async () => {
    mockTechTalkRepository.listAll.mockResolvedValue({
      techTalks: [],
      total: 0,
    });

    const res = await request(app)
      .get(`${adminListPath}?sort=invalidField`)
      .set('x-test-user-id', 'admin-1')
      .set('x-test-user-email', 'admin@test.com')
      .set('x-test-user-role', 'Admin');

    expect(res.status).toBe(HttpStatusCode.OK);
    expect(res.body.success).toBe(true);
    expect(mockTechTalkRepository.listAll).toHaveBeenCalledWith(
      expect.objectContaining({ sort: 'invalidField' })
    );
  });
});

describe('GET /api/v1/techTalks/:id - Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const publishedTalk = createTechTalk({
    id: 'tt-pub-1',
    title: 'Published Tech Talk',
    description: 'Detailed description',
    presenters: ['Alice', 'Bob'],
    tags: ['Architecture'],
    eventDate: '2026-09-01T10:00:00.000Z',
    slidesUrl: 'https://storage.example.com/slides/tt-pub-1.pdf',
    youtubeVideoId: 'dQw4w9WgXcQ',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  });

  const draftTalk = createTechTalk({
    id: 'tt-draft-1',
    title: 'Draft Tech Talk',
    description: 'Draft description',
    presenters: ['Charlie'],
    tags: ['Testing'],
    eventDate: '2026-10-01T10:00:00.000Z',
    status: 'draft',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).get('/api/v1/techTalks/tt-pub-1');
    expect(res.status).toBe(HttpStatusCode.UNAUTHORIZED);
  });

  it('returns 200 for any authenticated user on a Published Tech Talk (including slidesUrl and youtubeVideoId)', async () => {
    mockTechTalkRepository.findById.mockResolvedValue(publishedTalk);

    const res = await request(app)
      .get('/api/v1/techTalks/tt-pub-1')
      .set('x-test-user-id', 'user-1')
      .set('x-test-user-email', 'user@test.com')
      .set('x-test-user-role', 'User');

    expect(res.status).toBe(HttpStatusCode.OK);
    expect(res.body).toEqual({
      success: true,
      data: publishedTalk,
      message: 'Tech Talk retrieved successfully',
    });
    expect(res.body.data.slidesUrl).toBe(
      'https://storage.example.com/slides/tt-pub-1.pdf'
    );
    expect(res.body.data.youtubeVideoId).toBe('dQw4w9WgXcQ');
  });

  it('returns 403 for a non-Admin on a Draft Tech Talk', async () => {
    mockTechTalkRepository.findById.mockResolvedValue(draftTalk);

    const res = await request(app)
      .get('/api/v1/techTalks/tt-draft-1')
      .set('x-test-user-id', 'user-1')
      .set('x-test-user-email', 'user@test.com')
      .set('x-test-user-role', 'User');

    expect(res.status).toBe(HttpStatusCode.FORBIDDEN);
    expect(res.body).toEqual({
      success: false,
      error: 'Tech Talk not available',
    });
  });

  it('returns 200 for an Admin on a Draft Tech Talk', async () => {
    mockTechTalkRepository.findById.mockResolvedValue(draftTalk);

    const res = await request(app)
      .get('/api/v1/techTalks/tt-draft-1')
      .set('x-test-user-id', 'admin-1')
      .set('x-test-user-email', 'admin@test.com')
      .set('x-test-user-role', 'Admin');

    expect(res.status).toBe(HttpStatusCode.OK);
    expect(res.body).toEqual({
      success: true,
      data: draftTalk,
      message: 'Tech Talk retrieved successfully',
    });
  });

  it('returns 404 for a missing id', async () => {
    mockTechTalkRepository.findById.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/v1/techTalks/missing-id')
      .set('x-test-user-id', 'admin-1')
      .set('x-test-user-email', 'admin@test.com')
      .set('x-test-user-role', 'Admin');

    expect(res.status).toBe(HttpStatusCode.NOT_FOUND);
    expect(res.body).toEqual({
      success: false,
      error: 'Tech Talk not found',
    });
  });
});

describe('DELETE /api/v1/techTalks/:id - Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const deletePath = (id: string) => `/api/v1/techTalks/${id}`;

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).delete(deletePath('tt-1'));
    expect(res.status).toBe(HttpStatusCode.UNAUTHORIZED);
  });

  it('returns 403 when authenticated as non-Admin (e.g. User)', async () => {
    const res = await request(app)
      .delete(deletePath('tt-1'))
      .set('x-test-user-id', 'user-1')
      .set('x-test-user-email', 'user@test.com')
      .set('x-test-user-role', 'User');

    expect(res.status).toBe(HttpStatusCode.FORBIDDEN);
  });

  it('returns 404 when tech talk is not found', async () => {
    const error = new Error('Record to update not found');
    (error as any).code = 'P2025';
    mockTechTalkRepository.softDelete.mockRejectedValue(error);

    const res = await request(app)
      .delete(deletePath('non-existent-id'))
      .set('x-test-user-id', 'admin-1')
      .set('x-test-user-email', 'admin@test.com')
      .set('x-test-user-role', 'Admin');

    expect(res.status).toBe(HttpStatusCode.NOT_FOUND);
    expect(res.body.error).toBe('Tech Talk not found');
    expect(mockTechTalkRepository.softDelete).toHaveBeenCalledWith(
      'non-existent-id'
    );
  });

  it('returns 200 and soft-deletes the tech talk for Admin (regardless of draft/published status)', async () => {
    const existingTalk = createTechTalk({
      id: 'tt-1',
      title: 'Some Tech Talk',
    });
    mockTechTalkRepository.softDelete.mockResolvedValue({
      ...existingTalk,
      deletedAt: new Date(),
    });

    const res = await request(app)
      .delete(deletePath('tt-1'))
      .set('x-test-user-id', 'admin-1')
      .set('x-test-user-email', 'admin@test.com')
      .set('x-test-user-role', 'Admin');

    expect(res.status).toBe(HttpStatusCode.OK);
    expect(res.body).toEqual({
      success: true,
      data: null,
      message: 'Tech Talk deleted successfully',
    });

    expect(mockTechTalkRepository.findById).not.toHaveBeenCalled();
    expect(mockTechTalkRepository.softDelete).toHaveBeenCalledWith('tt-1');
  });
});
