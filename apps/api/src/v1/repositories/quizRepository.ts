import { prisma } from '@repo/db';
import type {
  GeneratedQuizQuestion,
  QuizRecord,
  QuizQuestionRecord,
} from '@models/quiz.types.js';
import type { QuestionType } from '@models/quiz.types.js';
import type { Prisma } from '@repo/db';

interface PrismaQuizQuestion {
  id: string;
  quizId: string;
  question: string;
  type: string;
  options: unknown;
  correctAnswer: unknown;
  explanation: string | null;
}

interface PrismaQuiz {
  id: string;
  articleId: string;
  isFallback: boolean;
  generatedAt: Date;
  questions: PrismaQuizQuestion[];
}

export interface CreateQuizInput {
  articleId: string;
  isFallback: boolean;
  questions: GeneratedQuizQuestion[];
  configSnapshot: Record<string, unknown>;
}

const toQuestionRecord = (row: PrismaQuizQuestion): QuizQuestionRecord => ({
  id: row.id,
  quizId: row.quizId,
  question: row.question,
  type: row.type as QuestionType,
  options: row.options as string[],
  correctIndexes: row.correctAnswer as number[],
  explanation: row.explanation ?? '',
});

const toQuizRecord = (row: PrismaQuiz): QuizRecord => ({
  id: row.id,
  articleId: row.articleId,
  isFallback: row.isFallback,
  generatedAt: row.generatedAt,
  questions: row.questions.map(toQuestionRecord),
});

/** Persists a quiz and its questions atomically via a nested create. */
const create = async (input: CreateQuizInput): Promise<QuizRecord> => {
  const result = await prisma.quiz.create({
    data: {
      articleId: input.articleId,
      isFallback: input.isFallback,
      configSnapshot: input.configSnapshot as Prisma.InputJsonValue,
      questions: {
        create: input.questions.map((question) => ({
          question: question.question,
          type: question.type,
          options: question.options as Prisma.InputJsonValue,
          correctAnswer: question.correctIndexes as Prisma.InputJsonValue,
          explanation: question.explanation || null,
        })),
      },
    },
    include: { questions: true },
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
    include: { questions: true },
  });

  return result ? toQuizRecord(result as unknown as PrismaQuiz) : null;
};

export default { create, findLatestFallbackByArticleId };
