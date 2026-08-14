// apps/api/src/repositories/__tests__/quizRepository.test.ts

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type { GeneratedQuizQuestion } from '@models/quiz.types.js';

// ── ESM mock registration — must be before any import of the repository ─────

const mockCreate = jest.fn<(args: unknown) => Promise<unknown>>();
const mockFindFirst = jest.fn<(args: unknown) => Promise<unknown>>();
const mockFindUnique = jest.fn<(args: unknown) => Promise<unknown>>();
const mockUpdate = jest.fn<(args: unknown) => Promise<unknown>>();
const mockFocusFindUnique = jest.fn<(args: unknown) => Promise<unknown>>();
const mockFocusUpsert = jest.fn<(args: unknown) => Promise<unknown>>();

await jest.unstable_mockModule('@repo/db', () => ({
  prisma: {
    quiz: {
      create: mockCreate,
      findFirst: mockFindFirst,
      findUnique: mockFindUnique,
      update: mockUpdate,
    },
    quizFocusAspects: {
      findUnique: mockFocusFindUnique,
      upsert: mockFocusUpsert,
    },
  },
}));

// Import AFTER mock is registered (ESM requirement)
const { QuizRepository } = await import('../quizRepository.js');
const quizRepository = new QuizRepository();

const articleId = 'article-1';
const quizId = 'quiz-1';

const makeQuestion = (
  overrides: Partial<GeneratedQuizQuestion> = {}
): GeneratedQuizQuestion => ({
  question: 'What is Neon?',
  type: 'mcq',
  options: ['A', 'B', 'C', 'D'],
  correctIndexes: [0],
  explanation: 'Because.',
  ...overrides,
});

const makeDbQuizRow = (overrides: Record<string, unknown> = {}) => ({
  id: quizId,
  articleId,
  isFallback: false,
  configSnapshot: { promptVersion: '1.0.0' },
  questions: [makeQuestion()],
  generatedAt: new Date('2026-08-13T00:00:00.000Z'),
  ...overrides,
});

describe('QuizRepository.findById', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the mapped quiz record when it exists', async () => {
    mockFindUnique.mockResolvedValue(makeDbQuizRow());

    const result = await quizRepository.findById(quizId);

    expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: quizId } });
    expect(result?.id).toBe(quizId);
    expect(result?.configSnapshot).toEqual({ promptVersion: '1.0.0' });
    expect(result?.questions).toHaveLength(1);
  });

  it('should return null when the quiz does not exist', async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await quizRepository.findById('nope');

    expect(result).toBeNull();
  });
});

describe('QuizRepository.update', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should overwrite the quiz row with new questions and config', async () => {
    mockUpdate.mockResolvedValue(makeDbQuizRow({ isFallback: true }));

    const questions = [makeQuestion({ question: 'Updated question?' })];
    const configSnapshot = { promptVersion: '1.0.0', savedFromQuizId: 'quiz-2' };

    const result = await quizRepository.update(quizId, { questions, configSnapshot });

    const [args] = mockUpdate.mock.calls[0] as unknown as [
      { where: { id: string }; data: { questions: unknown; configSnapshot: unknown; generatedAt: Date } }
    ];
    expect(args.where).toEqual({ id: quizId });
    expect(args.data.questions).toEqual(questions);
    expect(args.data.configSnapshot).toEqual(configSnapshot);
    expect(args.data.generatedAt).toBeInstanceOf(Date);
    expect(result.isFallback).toBe(true);
  });
});

describe('QuizRepository.findFocusAspectsByArticleId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the stored aspects string when a row exists', async () => {
    mockFocusFindUnique.mockResolvedValue({ articleId, aspects: 'Focus on branching' });

    const result = await quizRepository.findFocusAspectsByArticleId(articleId);

    expect(mockFocusFindUnique).toHaveBeenCalledWith({ where: { articleId } });
    expect(result).toBe('Focus on branching');
  });

  it('should return null when no row exists', async () => {
    mockFocusFindUnique.mockResolvedValue(null);

    const result = await quizRepository.findFocusAspectsByArticleId(articleId);

    expect(result).toBeNull();
  });
});

describe('QuizRepository.upsertFocusAspects', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should upsert and return the stored aspects', async () => {
    mockFocusUpsert.mockResolvedValue({ articleId, aspects: 'Focus on branching' });

    const result = await quizRepository.upsertFocusAspects(
      articleId,
      'Focus on branching',
      'author-1'
    );

    const [args] = mockFocusUpsert.mock.calls[0] as unknown as [
      {
        where: { articleId: string };
        create: { articleId: string; aspects: string; updatedBy: string };
        update: { aspects: string; updatedBy: string };
      }
    ];
    expect(args.where).toEqual({ articleId });
    expect(args.create).toEqual({ articleId, aspects: 'Focus on branching', updatedBy: 'author-1' });
    expect(args.update).toEqual({ aspects: 'Focus on branching', updatedBy: 'author-1' });
    expect(result).toBe('Focus on branching');
  });
});

describe('QuizRepository.findLatestFallbackByArticleId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the mapped quiz record including configSnapshot', async () => {
    mockFindFirst.mockResolvedValue(makeDbQuizRow({ isFallback: true }));

    const result = await quizRepository.findLatestFallbackByArticleId(articleId);

    expect(result?.configSnapshot).toEqual({ promptVersion: '1.0.0' });
  });
});
