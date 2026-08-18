/**
 * Domain types for the AI Quiz Generator.
 * Domain owner: ai-integration-engineer
 */

import { AppError } from '@errors/AppError.js';
import * as z from 'zod';

export type QuestionType = 'mcq' | 'single_choice' | 'multiple_choice';

export const QuestionTypeValue = {
  Mcq: 'mcq',
  SingleChoice: 'single_choice',
  MultipleChoice: 'multiple_choice',
} as const satisfies Record<string, QuestionType>;

const QUESTION_TYPES = ['mcq', 'single_choice', 'multiple_choice'] as const;

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
  configSnapshot: Record<string, unknown>;
}

export interface GenerateQuizResponse {
  quizId: string;
  articleId: string;
  isFallback: boolean;
  questions: QuizQuestionPublic[];
}

/**
 * Pure structural shape of a generated question — the single source of truth
 * for both Gemini's response_format JSON Schema (geminiQuizProvider.ts) and the
 * runtime validation below. Deliberately excludes cross-field business rules
 * (answer-count-per-type, index bounds), which plain JSON Schema can't express.
 */
export const quizQuestionShape = z.object({
  question: z.string(),
  type: z.enum(QUESTION_TYPES),
  options: z.array(z.string()).min(2),
  correctIndexes: z.array(z.number().int().nonnegative()).min(1),
  explanation: z.string().optional(),
});

// LLMs drift between the canonical array shape ("correctIndexes": [2]) and a
// single-answer shape ("correctIndex": 2) — tolerate both before validating.
const withCorrectIndexFallback = (raw: unknown): unknown => {
  if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
    const candidate = raw as Record<string, unknown>;
    if (candidate.correctIndexes === undefined && typeof candidate.correctIndex === 'number') {
      return { ...candidate, correctIndexes: [candidate.correctIndex] };
    }
  }
  return raw;
};

const quizQuestionSchema = z
  .preprocess(withCorrectIndexFallback, quizQuestionShape)
  .superRefine((question, ctx) => {
    if (question.question.trim().length === 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'has no question text',
        path: ['question'],
      });
    }
    if (question.correctIndexes.some((index) => index >= question.options.length)) {
      ctx.addIssue({
        code: 'custom',
        message: 'has an out-of-range correct answer index',
        path: ['correctIndexes'],
      });
    }
    if (
      question.type !== QuestionTypeValue.MultipleChoice &&
      question.correctIndexes.length !== 1
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'must have exactly one correct answer',
        path: ['correctIndexes'],
      });
    }
  })
  .transform(
    (question): GeneratedQuizQuestion => ({
      question: question.question.trim(),
      type: question.type,
      options: question.options,
      correctIndexes: [...new Set(question.correctIndexes)].sort((a, b) => a - b),
      explanation: question.explanation ?? '',
    })
  );

/**
 * Validates and normalizes the raw LLM output into typed questions.
 * Accepts a JSON array, an object with a `questions` array, or a JSON string
 * (optionally wrapped in markdown code fences).
 *
 * `expectedCount` is the admin-configurable question count — callers must pass
 * the effective quiz config value, never a hardcoded default.
 *
 * @throws AppError(502) when the payload does not satisfy the quiz contract.
 */
export const parseGeneratedQuestions = (
  raw: unknown,
  expectedCount: number
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

  const result = z.array(quizQuestionSchema).safeParse(payload);
  if (!result.success) {
    const issue = result.error.issues[0];
    const questionNumber =
      typeof issue?.path[0] === 'number' ? issue.path[0] + 1 : payload.length;
    throw new AppError(
      `Generated question ${questionNumber} ${issue?.message ?? 'is invalid'}`,
      502
    );
  }

  if (result.data.length !== expectedCount) {
    throw new AppError(
      `Expected ${expectedCount} generated questions but received ${result.data.length}`,
      502
    );
  }

  return result.data;
};

/** A single graded question, returned only after the quiz has been submitted. */
export interface QuizQuestionResult {
  id: string;
  question: string;
  type: QuestionType;
  options: string[];
  selected: number[];
  correctIndexes: number[];
  isCorrect: boolean;
}

/** The graded outcome of a submitted quiz. */
export interface QuizSubmitResponse {
  quizId: string;
  articleId: string;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  scorePercent: number;
  results: QuizQuestionResult[];
}

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
