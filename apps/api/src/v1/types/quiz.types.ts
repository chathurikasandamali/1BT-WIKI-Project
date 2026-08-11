/**
 * Domain types for the AI Quiz Generator.
 * Domain owner: ai-integration-engineer
 */

import { AppError } from '@errors/AppError.js';

export type QuestionType = 'mcq' | 'single_choice' | 'multiple_choice';

export const QuestionTypeValue = {
  Mcq: 'mcq',
  SingleChoice: 'single_choice',
  MultipleChoice: 'multiple_choice',
} as const satisfies Record<string, QuestionType>;

const QUESTION_TYPES: readonly QuestionType[] = [
  'mcq',
  'single_choice',
  'multiple_choice',
];

/** Number of questions generated per quiz until admin quiz_config exists. */
export const DEFAULT_QUESTION_COUNT = 10;

/** Options rendered per question. */
export const OPTIONS_PER_QUESTION = 4;

/** A question as produced by the LLM — includes the answers. Never send to clients. */
export interface GeneratedQuizQuestion {
  question: string;
  type: QuestionType;
  options: string[];
  correctIndexes: number[];
  explanation: string;
}

/** A stored question with answers, as read back from the database. */
export interface QuizQuestionRecord extends GeneratedQuizQuestion {
  id: string;
  quizId: string;
}

/** A question as exposed over the API — answers stripped. */
export interface QuizQuestionPublic {
  id: string;
  question: string;
  type: QuestionType;
  options: string[];
}

export interface QuizRecord {
  id: string;
  articleId: string;
  isFallback: boolean;
  generatedAt: Date;
  questions: QuizQuestionRecord[];
}

export interface GenerateQuizResponse {
  quizId: string;
  articleId: string;
  isFallback: boolean;
  questions: QuizQuestionPublic[];
}

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const isIndexArray = (value: unknown, optionCount: number): value is number[] =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every(
    (item) =>
      typeof item === 'number' &&
      Number.isInteger(item) &&
      item >= 0 &&
      item < optionCount
  );

const parseQuestion = (raw: unknown, index: number): GeneratedQuizQuestion => {
  if (typeof raw !== 'object' || raw === null) {
    throw new AppError(`Generated question ${index + 1} is not an object`, 502);
  }

  const candidate = raw as Record<string, unknown>;
  const { question, type, options, explanation } = candidate;
  // Tolerate the single-answer contract shape ("correctIndex": 2) as well as
  // the canonical array shape ("correctIndexes": [2]) — LLMs drift between them.
  const rawIndexes =
    candidate.correctIndexes ??
    (typeof candidate.correctIndex === 'number'
      ? [candidate.correctIndex]
      : undefined);

  if (typeof question !== 'string' || question.trim().length === 0) {
    throw new AppError(`Generated question ${index + 1} has no question text`, 502);
  }
  if (typeof type !== 'string' || !QUESTION_TYPES.includes(type as QuestionType)) {
    throw new AppError(`Generated question ${index + 1} has invalid type`, 502);
  }
  if (!isStringArray(options) || options.length < 2) {
    throw new AppError(`Generated question ${index + 1} has invalid options`, 502);
  }
  if (!isIndexArray(rawIndexes, options.length)) {
    throw new AppError(
      `Generated question ${index + 1} has invalid correct answer indexes`,
      502
    );
  }
  if (type !== QuestionTypeValue.MultipleChoice && rawIndexes.length !== 1) {
    throw new AppError(
      `Generated question ${index + 1} must have exactly one correct answer`,
      502
    );
  }

  return {
    question: question.trim(),
    type: type as QuestionType,
    options,
    correctIndexes: [...new Set(rawIndexes)].sort((a, b) => a - b),
    explanation: typeof explanation === 'string' ? explanation : '',
  };
};

/**
 * Validates and normalizes the raw LLM output into typed questions.
 * Accepts a JSON array, an object with a `questions` array, or a JSON string
 * (optionally wrapped in markdown code fences).
 *
 * @throws AppError(502) when the payload does not satisfy the quiz contract.
 */
export const parseGeneratedQuestions = (
  raw: unknown,
  expectedCount: number = DEFAULT_QUESTION_COUNT
): GeneratedQuizQuestion[] => {
  let payload: unknown = raw;

  if (typeof payload === 'string') {
    const stripped = payload
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '');
    try {
      payload = JSON.parse(stripped);
    } catch {
      throw new AppError('Generated quiz payload is not valid JSON', 502);
    }
  }

  if (
    typeof payload === 'object' &&
    payload !== null &&
    !Array.isArray(payload) &&
    Array.isArray((payload as Record<string, unknown>).questions)
  ) {
    payload = (payload as Record<string, unknown>).questions;
  }

  if (!Array.isArray(payload) || payload.length === 0) {
    throw new AppError('Generated quiz payload contains no questions', 502);
  }

  const questions = payload.map(parseQuestion);

  if (questions.length !== expectedCount) {
    throw new AppError(
      `Expected ${expectedCount} generated questions but received ${questions.length}`,
      502
    );
  }

  return questions;
};

/** Strips correct answers before a quiz leaves the API. */
export const toPublicQuestions = (
  questions: QuizQuestionRecord[]
): QuizQuestionPublic[] =>
  questions.map(({ id, question, type, options }) => ({
    id,
    question,
    type,
    options,
  }));
