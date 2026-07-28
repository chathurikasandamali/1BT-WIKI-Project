/**
 * HTTP client for the MS Foundry quiz-generation agent workflow
 * (generator agent → validator agent, exposed as a single workflow endpoint).
 *
 * Env:
 * - FOUNDRY_WORKFLOW_URL  — workflow invocation endpoint (required at call time)
 * - FOUNDRY_API_KEY       — bearer key for the workflow endpoint (required at call time)
 * - FOUNDRY_TIMEOUT_MS    — optional request timeout, default 60s
 */

import { AppError } from '@errors/AppError.js';
import {
  buildGeneratorPrompt,
  buildValidatorPrompt,
  PROMPT_VERSION,
  type QuizPromptInput,
} from '@v1/lib/prompts/quizPrompts.js';
import { DEFAULT_QUESTION_COUNT } from '@models/quiz.types.js';

const DEFAULT_TIMEOUT_MS = 60_000;

interface FoundryConfig {
  url: string;
  apiKey: string;
  timeoutMs: number;
}

const getConfig = (): FoundryConfig => {
  const url = process.env.FOUNDRY_WORKFLOW_URL;
  const apiKey = process.env.FOUNDRY_API_KEY;

  if (!url || !apiKey) {
    throw new AppError('Quiz generation is not configured', 503);
  }

  const parsedTimeout = Number(process.env.FOUNDRY_TIMEOUT_MS);
  const timeoutMs =
    Number.isFinite(parsedTimeout) && parsedTimeout > 0
      ? parsedTimeout
      : DEFAULT_TIMEOUT_MS;

  return { url, apiKey, timeoutMs };
};

/**
 * Invokes the Foundry workflow and returns its raw output for validation
 * by `parseGeneratedQuestions` — the client makes no schema guarantees.
 *
 * @throws AppError(503) when env config is missing,
 *         AppError(504) on timeout, AppError(502) on transport/HTTP failure.
 */
const generateQuestions = async (input: QuizPromptInput): Promise<unknown> => {
  const { url, apiKey, timeoutMs } = getConfig();
  const questionCount = input.questionCount ?? DEFAULT_QUESTION_COUNT;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        promptVersion: PROMPT_VERSION,
        questionCount,
        articleTitle: input.articleTitle,
        generatorPrompt: buildGeneratorPrompt({ ...input, questionCount }),
        validatorPrompt: buildValidatorPrompt({ ...input, questionCount }),
      }),
    });

    if (!response.ok) {
      throw new AppError(
        `Quiz workflow request failed with status ${response.status}`,
        502
      );
    }

    return (await response.json()) as unknown;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AppError('Quiz workflow request timed out', 504);
    }
    throw new AppError('Failed to reach the quiz workflow', 502);
  } finally {
    clearTimeout(timeout);
  }
};

export default { generateQuestions };
