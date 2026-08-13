// apps/api/src/services/__tests__/settingsService.test.ts

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { AppError } from '@errors/AppError.js';
import {
  createSettingsService,
  type SettingsService,
  type SettingsServiceDeps,
} from '../settingsService.js';

const makeMockRepository = () => ({
  findByKey: jest.fn<(key: string) => Promise<unknown>>(),
  findByCategory: jest.fn<(category: string) => Promise<unknown>>(),
  upsert: jest.fn<
    (
      key: string,
      category: string,
      value: Record<string, unknown>,
      updatedBy: string | null
    ) => Promise<unknown>
  >(),
});

const buildService = (
  mockRepo: ReturnType<typeof makeMockRepository>
): SettingsService =>
  createSettingsService({
    settingsRepository: mockRepo as unknown as SettingsServiceDeps['settingsRepository'],
  });

const makeRow = (overrides: Record<string, unknown> = {}) => ({
  key: 'quiz_config',
  category: 'quiz',
  value: { questionCount: 10, optionsPerQuestion: 4 },
  updatedBy: null,
  updatedAt: new Date(),
  ...overrides,
});

describe('SettingsService.getQuizConfig', () => {
  let mockRepo: ReturnType<typeof makeMockRepository>;
  let service: SettingsService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepo = makeMockRepository();
    service = buildService(mockRepo);
  });

  it('should return the code defaults when no DB row exists', async () => {
    mockRepo.findByKey.mockResolvedValue(null);

    await expect(service.getQuizConfig()).resolves.toEqual({
      questionCount: 10,
      optionsPerQuestion: 4,
    });
    expect(mockRepo.findByKey).toHaveBeenCalledWith('quiz_config');
  });

  it('should merge a partial stored value over the defaults', async () => {
    mockRepo.findByKey.mockResolvedValue(makeRow({ value: { questionCount: 5 } }));

    await expect(service.getQuizConfig()).resolves.toEqual({
      questionCount: 5,
      optionsPerQuestion: 4,
    });
  });

  it('should fall back to defaults when the stored value is invalid', async () => {
    mockRepo.findByKey.mockResolvedValue(
      makeRow({ value: { questionCount: 'not-a-number' } })
    );
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(service.getQuizConfig()).resolves.toEqual({
      questionCount: 10,
      optionsPerQuestion: 4,
    });
  });
});

describe('SettingsService.getSetting / listByCategory', () => {
  let mockRepo: ReturnType<typeof makeMockRepository>;
  let service: SettingsService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepo = makeMockRepository();
    service = buildService(mockRepo);
  });

  it('should throw AppError 400 for an unknown category', async () => {
    await expect(service.getSetting('bogus' as never, 'whatever')).rejects.toThrow(
      new AppError('Unknown setting category: bogus', 400)
    );
  });

  it('should throw AppError 400 for an unknown key in a known category', async () => {
    await expect(service.getSetting('general', 'whatever')).rejects.toThrow(
      new AppError('Unknown setting: general/whatever', 400)
    );
  });

  it('should list effective values for a category', async () => {
    mockRepo.findByCategory.mockResolvedValue([
      makeRow({ value: { questionCount: 7 } }),
    ]);

    await expect(service.listByCategory('quiz')).resolves.toEqual({
      quiz_config: { questionCount: 7, optionsPerQuestion: 4 },
    });
  });

  it('should return an empty object for a category with no defined settings', async () => {
    mockRepo.findByCategory.mockResolvedValue([]);

    await expect(service.listByCategory('general')).resolves.toEqual({});
  });

  it('should throw AppError 400 for an unknown category in listByCategory', async () => {
    await expect(
      service.listByCategory('unknown' as never)
    ).rejects.toThrow(new AppError('Unknown setting category: unknown', 400));
  });
});

describe('SettingsService.updateSetting', () => {
  let mockRepo: ReturnType<typeof makeMockRepository>;
  let service: SettingsService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRepo = makeMockRepository();
    service = buildService(mockRepo);
  });

  it('should merge the patch over the current value and persist the full config', async () => {
    mockRepo.findByKey.mockResolvedValue(makeRow());
    mockRepo.upsert.mockResolvedValue(
      makeRow({ value: { questionCount: 8, optionsPerQuestion: 4 } })
    );

    const result = await service.updateSetting(
      'quiz',
      'quiz_config',
      { questionCount: 8 },
      'admin-1'
    );

    expect(result).toEqual({ questionCount: 8, optionsPerQuestion: 4 });
    expect(mockRepo.upsert).toHaveBeenCalledWith(
      'quiz_config',
      'quiz',
      { questionCount: 8, optionsPerQuestion: 4 },
      'admin-1'
    );
  });

  it('should throw AppError 400 when the merged value fails validation', async () => {
    mockRepo.findByKey.mockResolvedValue(null);

    await expect(
      service.updateSetting('quiz', 'quiz_config', { questionCount: 0 }, 'admin-1')
    ).rejects.toThrow(
      new AppError(
        'Invalid setting value: questionCount Too small: expected number to be >=1',
        400
      )
    );
    expect(mockRepo.upsert).not.toHaveBeenCalled();
  });

  it('should throw AppError 400 for an unknown setting', async () => {
    await expect(
      service.updateSetting('quiz', 'nope', {}, 'admin-1')
    ).rejects.toThrow(new AppError('Unknown setting: quiz/nope', 400));
  });
});
