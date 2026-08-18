import { prisma } from '@repo/db';
import { AppError } from '@errors/AppError.js';
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
  // Deterministic, not randomUUID() — questions have no persisted per-row id
  // (stored as a single JSONB array), so this must stay stable across reads
  // or a quiz fetched again (e.g. by submitQuiz) won't match the question
  // ids the reader was originally served.
  id: `${quizId}-${index}`,
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
    configSnapshot: (row.configSnapshot as Record<string, unknown>) ?? {},
  };
};

export interface UpdateQuizInput {
  questions: GeneratedQuizQuestion[];
  configSnapshot: Record<string, unknown>;
}

export class QuizRepository {
  /**
   * Persist a quiz with its questions as a single JSONB column.
   *
   * @param input - The article/fallback flag, generated questions, and the
   * config snapshot that produced them.
   * @returns The newly created quiz row.
   */
  async create(input: CreateQuizInput): Promise<QuizRecord> {
    try {
      const result = await prisma.quiz.create({
        data: {
          articleId: input.articleId,
          isFallback: input.isFallback,
          configSnapshot: input.configSnapshot as Prisma.InputJsonValue,
          questions: input.questions as unknown as Prisma.InputJsonValue,
        },
      });

      return toQuizRecord(result);
    } catch (error) {
      console.error('Error creating quiz:', error);
      throw new AppError('Database is unavailable', 503);
    }
  }

  /**
   * Fetch the most recently generated fallback quiz for an article, if any.
   *
   * @param articleId - The article's UUID.
   * @returns The latest fallback quiz, or `null` if none has been generated.
   */
  async findLatestFallbackByArticleId(articleId: string): Promise<QuizRecord | null> {
    try {
      const result = await prisma.quiz.findFirst({
        where: { articleId, isFallback: true },
        orderBy: { generatedAt: 'desc' },
      });

      return result ? toQuizRecord(result) : null;
    } catch (error) {
      console.error('Error fetching latest fallback quiz:', error);
      throw new AppError('Database is unavailable', 503);
    }
  }

  /**
   * Fetch a single quiz by its id, regardless of fallback status.
   *
   * @param quizId - The quiz's UUID.
   * @returns The quiz, or `null` if it doesn't exist.
   */
  async findById(quizId: string): Promise<QuizRecord | null> {
    try {
      const result = await prisma.quiz.findUnique({ where: { id: quizId } });

      return result ? toQuizRecord(result) : null;
    } catch (error) {
      console.error('Error fetching quiz by id:', error);
      throw new AppError('Database is unavailable', 503);
    }
  }

  /**
   * Overwrite an existing quiz row's questions/config in place.
   *
   * @param quizId - The quiz's UUID.
   * @param input - The replacement questions and the config snapshot that produced them.
   * @returns The updated quiz row.
   */
  async update(quizId: string, input: UpdateQuizInput): Promise<QuizRecord> {
    try {
      const result = await prisma.quiz.update({
        where: { id: quizId },
        data: {
          questions: input.questions as unknown as Prisma.InputJsonValue,
          configSnapshot: input.configSnapshot as Prisma.InputJsonValue,
          generatedAt: new Date(),
        },
      });

      return toQuizRecord(result);
    } catch (error) {
      console.error('Error updating quiz:', error);
      throw new AppError('Database is unavailable', 503);
    }
  }

  /**
   * Read the author-defined focus-aspects hint for an article, if any.
   *
   * @param articleId - The article's UUID.
   * @returns The saved aspects string, or `null` if none has been set.
   */
  async findFocusAspectsByArticleId(articleId: string): Promise<string | null> {
    try {
      const result = await prisma.quizFocusAspects.findUnique({ where: { articleId } });

      return result?.aspects ?? null;
    } catch (error) {
      console.error('Error fetching quiz focus aspects:', error);
      throw new AppError('Database is unavailable', 503);
    }
  }

  /**
   * Create or overwrite the focus-aspects hint for an article.
   *
   * @param articleId - The article's UUID.
   * @param aspects - The trimmed, non-empty aspects text.
   * @param updatedBy - The author's user id.
   * @returns The stored aspects string.
   */
  async upsertFocusAspects(
    articleId: string,
    aspects: string,
    updatedBy: string
  ): Promise<string> {
    try {
      const result = await prisma.quizFocusAspects.upsert({
        where: { articleId },
        create: { articleId, aspects, updatedBy },
        update: { aspects, updatedBy },
      });

      return result.aspects;
    } catch (error) {
      console.error('Error upserting quiz focus aspects:', error);
      throw new AppError('Database is unavailable', 503);
    }
  }
}

export default new QuizRepository();
