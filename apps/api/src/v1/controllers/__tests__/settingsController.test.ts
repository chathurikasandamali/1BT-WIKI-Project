// apps/api/src/controllers/__tests__/settingsController.test.ts

import { jest } from '@jest/globals';
import { AppError } from '@errors/AppError.js';
import { createSettingsController } from '@controllers/settingsController.js';
import type { SettingsService } from '@services/settingsService.js';
import { makeMockReqResNext } from '../../__tests__/helpers/mockExpress.helpers.js';

const makeMockSettingsService = (): SettingsService =>
  ({
    getSetting: jest.fn(),
    listByCategory: jest.fn(),
    updateSetting: jest.fn(),
    getQuizConfig: jest.fn(),
  }) as unknown as SettingsService;

const quizConfigValue = { questionCount: 10, optionsPerQuestion: 4 };

describe('settingsController.list', () => {
  let mockService: SettingsService;
  let controller: ReturnType<typeof createSettingsController>;

  beforeEach(() => {
    mockService = makeMockSettingsService();
    controller = createSettingsController(mockService);
  });

  it('should list all categories when no category filter is given', async () => {
    (mockService.listByCategory as jest.Mock<any>).mockResolvedValue({
      quiz_config: quizConfigValue,
    });

    const { req, res, next } = makeMockReqResNext({ query: {} } as any);

    await controller.list(req as any, res as any, next);

    expect(mockService.listByCategory).toHaveBeenCalledTimes(6);
    expect(res.status).toHaveBeenCalledWith(200);
    const [jsonArgs] = (res.json as jest.Mock<any>).mock.calls[0] as [any];
    expect(jsonArgs.success).toBe(true);
    expect(jsonArgs.data.quiz.quiz_config).toEqual(quizConfigValue);
    expect(next).not.toHaveBeenCalled();
  });

  it('should list a single category when a known category filter is given', async () => {
    (mockService.listByCategory as jest.Mock<any>).mockResolvedValue({
      quiz_config: quizConfigValue,
    });

    const { req, res, next } = makeMockReqResNext({
      query: { category: 'quiz' },
    } as any);

    await controller.list(req as any, res as any, next);

    expect(mockService.listByCategory).toHaveBeenCalledTimes(1);
    expect(mockService.listByCategory).toHaveBeenCalledWith('quiz');
    const [jsonArgs] = (res.json as jest.Mock<any>).mock.calls[0] as [any];
    expect(jsonArgs.data.quiz.quiz_config).toEqual(quizConfigValue);
  });

  it('should reject an unknown category with AppError 400', async () => {
    const { req, res, next } = makeMockReqResNext({
      query: { category: 'nope' },
    } as any);

    await controller.list(req as any, res as any, next);

    expect(next).toHaveBeenCalledWith(
      new AppError('Unknown setting category: nope', 400)
    );
    expect(mockService.listByCategory).not.toHaveBeenCalled();
  });

  it('should mask the LLM apiKey in the listed quiz_llm_config', async () => {
    (mockService.listByCategory as jest.Mock<any>).mockResolvedValue({
      quiz_llm_config: { provider: 'gemini', model: 'gemini-3.5-flash', apiKey: 'sk-real-key' },
    });

    const { req, res, next } = makeMockReqResNext({
      query: { category: 'quiz' },
    } as any);

    await controller.list(req as any, res as any, next);

    const [jsonArgs] = (res.json as jest.Mock<any>).mock.calls[0] as [any];
    expect(jsonArgs.data.quiz.quiz_llm_config.apiKey).not.toBe('sk-real-key');
    expect(jsonArgs.data.quiz.quiz_llm_config.provider).toBe('gemini');
  });
});

describe('settingsController.getOne', () => {
  let mockService: SettingsService;
  let controller: ReturnType<typeof createSettingsController>;

  beforeEach(() => {
    mockService = makeMockSettingsService();
    controller = createSettingsController(mockService);
  });

  it('should read a single setting via the service', async () => {
    (mockService.getSetting as jest.Mock<any>).mockResolvedValue(quizConfigValue);

    const { req, res, next } = makeMockReqResNext({
      params: { category: 'quiz', key: 'quiz_config' },
    } as any);

    await controller.getOne(req as any, res as any, next);

    expect(mockService.getSetting).toHaveBeenCalledWith('quiz', 'quiz_config');
    expect(res.status).toHaveBeenCalledWith(200);
    const [jsonArgs] = (res.json as jest.Mock<any>).mock.calls[0] as [any];
    expect(jsonArgs.data).toEqual(quizConfigValue);
  });

  it('should reject an unknown category with AppError 400', async () => {
    const { req, res, next } = makeMockReqResNext({
      params: { category: 'nope', key: 'quiz_config' },
    } as any);

    await controller.getOne(req as any, res as any, next);

    expect(next).toHaveBeenCalledWith(
      new AppError('Unknown setting category: nope', 400)
    );
    expect(mockService.getSetting).not.toHaveBeenCalled();
  });

  it('should mask the LLM apiKey when reading quiz_llm_config', async () => {
    (mockService.getSetting as jest.Mock<any>).mockResolvedValue({
      provider: 'gemini',
      model: 'gemini-3.5-flash',
      apiKey: 'sk-real-key',
    });

    const { req, res, next } = makeMockReqResNext({
      params: { category: 'quiz', key: 'quiz_llm_config' },
    } as any);

    await controller.getOne(req as any, res as any, next);

    const [jsonArgs] = (res.json as jest.Mock<any>).mock.calls[0] as [any];
    expect(jsonArgs.data.apiKey).not.toBe('sk-real-key');
    expect(jsonArgs.data.provider).toBe('gemini');
  });
});

describe('settingsController.update', () => {
  let mockService: SettingsService;
  let controller: ReturnType<typeof createSettingsController>;

  beforeEach(() => {
    mockService = makeMockSettingsService();
    controller = createSettingsController(mockService);
  });

  it('should partial-update a setting with the authenticated user id', async () => {
    (mockService.updateSetting as jest.Mock<any>).mockResolvedValue({
      questionCount: 8,
      optionsPerQuestion: 4,
    });

    const { req, res, next } = makeMockReqResNext({
      params: { category: 'quiz', key: 'quiz_config' },
      body: { questionCount: 8 },
      user: { userId: 'admin-1' } as any,
    } as any);

    await controller.update(req as any, res as any, next);

    expect(mockService.updateSetting).toHaveBeenCalledWith(
      'quiz',
      'quiz_config',
      { questionCount: 8 },
      'admin-1'
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should reject an unknown category with AppError 400', async () => {
    const { req, res, next } = makeMockReqResNext({
      params: { category: 'nope', key: 'quiz_config' },
    } as any);

    await controller.update(req as any, res as any, next);

    expect(next).toHaveBeenCalledWith(
      new AppError('Unknown setting category: nope', 400)
    );
    expect(mockService.updateSetting).not.toHaveBeenCalled();
  });

  it('should forward service validation errors to next', async () => {
    const error = new AppError('Invalid setting value: questionCount must be >= 1', 400);
    (mockService.updateSetting as jest.Mock<any>).mockRejectedValue(error);

    const { req, res, next } = makeMockReqResNext({
      params: { category: 'quiz', key: 'quiz_config' },
      body: { questionCount: 0 },
    } as any);

    await controller.update(req as any, res as any, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('should mask the LLM apiKey in the update response', async () => {
    (mockService.updateSetting as jest.Mock<any>).mockResolvedValue({
      provider: 'gemini',
      model: 'gemini-3.5-flash',
      apiKey: 'sk-rotated-key',
    });

    const { req, res, next } = makeMockReqResNext({
      params: { category: 'quiz', key: 'quiz_llm_config' },
      body: { apiKey: 'sk-rotated-key' },
      user: { userId: 'admin-1' } as any,
    } as any);

    await controller.update(req as any, res as any, next);

    const [jsonArgs] = (res.json as jest.Mock<any>).mock.calls[0] as [any];
    expect(jsonArgs.data.apiKey).not.toBe('sk-rotated-key');
  });
});
