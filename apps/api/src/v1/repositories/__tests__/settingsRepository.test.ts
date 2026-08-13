// apps/api/src/repositories/__tests__/settingsRepository.test.ts

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// ── ESM mock registration — must be before any import of the repository ─────

const mockFindUnique = jest.fn<(args: unknown) => Promise<unknown>>();
const mockFindMany = jest.fn<(args: unknown) => Promise<unknown>>();
const mockUpsert = jest.fn<(args: unknown) => Promise<unknown>>();

await jest.unstable_mockModule('@repo/db', () => ({
  TechTalkStatus: { draft: 'draft', published: 'published', unpublished: 'unpublished' },
  prisma: {
    appSettings: {
      findUnique: mockFindUnique,
      findMany: mockFindMany,
      upsert: mockUpsert,
    },
  },
}));

// Import AFTER mock is registered (ESM requirement)
const { default: SettingsRepository } = await import('../settingsRepository.js');

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const makeDbRow = (overrides: Record<string, unknown> = {}) => ({
  key: 'quiz_config',
  category: 'quiz',
  value: { questionCount: 10, optionsPerQuestion: 4 },
  updatedBy: null,
  updatedAt: new Date('2026-08-12T00:00:00.000Z'),
  ...overrides,
});

const expectedRecord = {
  key: 'quiz_config',
  category: 'quiz',
  value: { questionCount: 10, optionsPerQuestion: 4 },
  updatedBy: null,
  updatedAt: new Date('2026-08-12T00:00:00.000Z'),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SettingsRepository.findByKey', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the mapped record when a row exists', async () => {
    mockFindUnique.mockResolvedValue(makeDbRow());

    const result = await SettingsRepository.findByKey('quiz_config');

    expect(mockFindUnique).toHaveBeenCalledTimes(1);
    const [args] = mockFindUnique.mock.calls[0] as unknown as [
      { where: { key: string } }
    ];
    expect(args.where).toEqual({ key: 'quiz_config' });
    expect(result).toEqual(expectedRecord);
  });

  it('should return null when no row exists', async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await SettingsRepository.findByKey('nope');

    expect(result).toBeNull();
  });

  it('should throw AppError(503) when the database query fails', async () => {
    mockFindUnique.mockRejectedValue(new Error('connection reset'));

    await expect(SettingsRepository.findByKey('quiz_config')).rejects.toThrow(
      'Database is unavailable'
    );
  });
});

describe('SettingsRepository.findByCategory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return all rows for the category', async () => {
    mockFindMany.mockResolvedValue([makeDbRow()]);

    const result = await SettingsRepository.findByCategory('quiz');

    const [args] = mockFindMany.mock.calls[0] as unknown as [
      { where: { category: string } }
    ];
    expect(args.where).toEqual({ category: 'quiz' });
    expect(result).toEqual([expectedRecord]);
  });

  it('should return an empty array when the category has no rows', async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await SettingsRepository.findByCategory('general');

    expect(result).toEqual([]);
  });
});

describe('SettingsRepository.upsert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call prisma upsert with update and create branches', async () => {
    mockUpsert.mockResolvedValue(makeDbRow());

    const value = { questionCount: 12, optionsPerQuestion: 4 };
    await SettingsRepository.upsert('quiz_config', 'quiz', value, 'admin-1');

    const [args] = mockUpsert.mock.calls[0] as unknown as [
      {
        create: {
          key: string;
          category: string;
          value: unknown;
          updatedBy: string;
        };
        update: { category: string; value: unknown; updatedBy: string };
      }
    ];
    expect(args.create).toEqual({
      key: 'quiz_config',
      category: 'quiz',
      value,
      updatedBy: 'admin-1',
    });
    expect(args.update).toEqual({
      category: 'quiz',
      value,
      updatedBy: 'admin-1',
    });
  });

  it('should throw AppError(503) when the database query fails', async () => {
    mockUpsert.mockRejectedValue(new Error('connection reset'));

    await expect(
      SettingsRepository.upsert('quiz_config', 'quiz', {}, 'admin-1')
    ).rejects.toThrow('Database is unavailable');
  });
});
