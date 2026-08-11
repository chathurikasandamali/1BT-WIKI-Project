import { randomUUID } from 'node:crypto';
import { prisma } from '@repo/db';
import type {
  GeneratedQuizQuestion,
  QuizRecord,
  QuizQuestionRecord,
  QuestionType,
} from '@models/quiz.types.js';

import type { Prisma } from '@repo/db';

interface PrismaQuiz {
  id: string;
  articleId: string;
  isFallback: boolean;
  configSnapshot: unknown;
  questions: unknown;
  generatedAt: Date;
}

export interface CreateQuizInput {
  articleId: string;
  isFallback: boolean;
  questions: GeneratedQuizQuestion[];
  configSnapshot: Record<string, unknown>;
}

const toQuestionRecord = (
  question: GeneratedQuizQuestion,
  quizId: string,
  index: number
): QuizQuestionRecord => ({
  id: randomUUID(),
  quizId,
  question: question.question,
  type: question.type,
  options: question.options,
  correctIndexes: question.correctIndexes,
  explanation: question.explanation,
});

const toQuizRecord = (row: PrismaQuiz): QuizRecord => {
  const questions = (row.questions as GeneratedQuizQuestion[]) ?? [];

  return {
    id: row.id,
    articleId: row.articleId,
    isFallback: row.isFallback,
    generatedAt: row.generatedAt,
    questions: questions.map((q, i) => toQuestionRecord(q, row.id, i)),
  };
};

/** Persists a quiz with questions as a single JSONB column. */
const create = async (input: CreateQuizInput): Promise<QuizRecord> => {
  const result = await prisma.quiz.create({
    data: {
      articleId: input.articleId,
      isFallback: input.isFallback,
      configSnapshot: input.configSnapshot as Prisma.InputJsonValue,
      questions: input.questions as unknown as Prisma.InputJsonValue,
    },
  });

  return toQuizRecord(result as unknown as PrismaQuiz);
};

/** Latest pre-generated fallback quiz for an article, if any. */
const findLatestFallbackByArticleId = async (
  articleId: string
): Promise<QuizRecord | null> => {
  const result = await prisma.quiz.findFirst({
    where: { articleId, isFallback: true },
    orderBy: { generatedAt: 'desc' },
  });

  return result ? toQuizRecord(result as unknown as PrismaQuiz) : null;
};

export default { create, findLatestFallbackByArticleId };
