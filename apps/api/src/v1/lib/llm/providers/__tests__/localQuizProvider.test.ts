import { jest, describe, it, expect, afterEach } from '@jest/globals';
import { AppError } from '@errors/AppError.js';
import type { QuizPromptInput } from '@v1/lib/prompts/quizPrompts.js';
import localQuizProvider from '../localQuizProvider.js';

const input: QuizPromptInput = {
  articleTitle: 'Test Article',
  articleText: 'Some article body.',
  questionCount: 2,
  optionsPerQuestion: 4,
};

const config = { model: 'qwen2.5vl', endpoint: 'http://localhost:11434', apiKey: undefined };

const validQuestions = [
  {
    question: 'What is 1 + 1?',
    type: 'mcq' as const,
    options: ['1', '2', '3', '4'],
    correctIndexes: [1],
    explanation: 'Basic addition.',
  },
  {
    question: 'What is 2 + 2?',
    type: 'mcq' as const,
    options: ['2', '3', '4', '5'],
    correctIndexes: [2],
    explanation: 'Basic addition.',
  },
];

const mockFetchResolved = (body: unknown, ok = true, status = 200): void => {
  jest.spyOn(global, 'fetch').mockResolvedValue({
    ok,
    status,
    json: async () => body,
  } as Response);
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe('LocalQuizProvider.generateQuestions', () => {
  it('sends the expected request and parses a valid response', async () => {
    mockFetchResolved({ message: { content: JSON.stringify(validQuestions) } });

    const result = await localQuizProvider.generateQuestions(input, config);

    expect(global.fetch).toHaveBeenCalledWith(
      `${config.endpoint}/api/chat`,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const call = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    const requestBody = JSON.parse(call[1].body as string);
    expect(requestBody.model).toBe(config.model);
    expect(requestBody.stream).toBe(false);
    expect(requestBody.format).toBeDefined();

    expect(result).toEqual(validQuestions.map((q) => ({ ...q, correctIndexes: q.correctIndexes })));
  });

  it('throws a generic AppError when the response is not ok', async () => {
    mockFetchResolved({}, false, 500);

    await expect(localQuizProvider.generateQuestions(input, config)).rejects.toThrow(
      new AppError('Failed to reach Local LLM', 502)
    );
  });

  it('throws a timeout AppError when the request aborts', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(
      Object.assign(new Error('aborted'), { name: 'AbortError' })
    );

    await expect(localQuizProvider.generateQuestions(input, config)).rejects.toThrow(
      new AppError('Local LLM request timed out', 504)
    );
  });

  it('propagates the AppError from parseGeneratedQuestions on malformed content', async () => {
    mockFetchResolved({ message: { content: 'not json' } });

    await expect(localQuizProvider.generateQuestions(input, config)).rejects.toThrow(
      new AppError('Generated quiz payload is not valid JSON', 502)
    );
  });

  it('falls back to an empty payload (not a crash) when message.content is missing', async () => {
    mockFetchResolved({ message: {} });

    await expect(localQuizProvider.generateQuestions(input, config)).rejects.toThrow(
      new AppError('Generated quiz payload contains no questions', 502)
    );
  });
});
