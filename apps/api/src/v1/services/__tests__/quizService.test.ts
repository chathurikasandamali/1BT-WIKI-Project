import { jest } from '@jest/globals';
import { AppError } from '@errors/AppError.js';
import {
  DEFAULT_QUESTION_COUNT,
  type GeneratedQuizQuestion,
} from '@models/quiz.types.js';

jest.unstable_mockModule('@repositories/articleRepository.js', () => ({
  default: {
    findById: jest.fn(),
  },
}));

jest.unstable_mockModule('@repositories/quizRepository.js', () => ({
  default: {
    create: jest.fn(),
    findLatestFallbackByArticleId: jest.fn(),
  },
}));

jest.unstable_mockModule('@v1/lib/foundryClient.js', () => ({
  default: {
    generateQuestions: jest.fn(),
  },
}));

const { default: QuizService } = await import('../quizService.js');
const { default: ArticleRepository } =
  await import('@repositories/articleRepository.js');
const { default: QuizRepository } =
  await import('@repositories/quizRepository.js');
const { default: FoundryClient } = await import('@v1/lib/foundryClient.js');

const articleId = 'article-123';

const publishedArticle = {
  id: articleId,
  title: 'Test Article',
  authorId: 'author-1',
  status: 'Published',
  body: {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Neon PostgreSQL supports branching.' }],
      },
    ],
  },
};

const makeGeneratedQuestions = (): GeneratedQuizQuestion[] =>
  Array.from({ length: DEFAULT_QUESTION_COUNT }, (_, i) => ({
    question: `Question ${i + 1}?`,
    type: i === 0 ? 'multiple_choice' : 'mcq',
    options: ['A', 'B', 'C', 'D'],
    correctIndexes: i === 0 ? [0, 1] : [0],
    explanation: `Explanation ${i + 1}`,
  }));

const makeStoredQuiz = (isFallback: boolean) => ({
  id: 'quiz-1',
  articleId,
  isFallback,
  generatedAt: new Date(),
  questions: makeGeneratedQuestions().map((q, i) => ({
    ...q,
    id: `question-${i}`,
    quizId: 'quiz-1',
  })),
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('QuizService.generateQuiz', () => {
  it('should throw AppError 404 if article is not found', async () => {
    (ArticleRepository.findById as jest.Mock<any>).mockResolvedValue(null);

    await expect(QuizService.generateQuiz(articleId)).rejects.toThrow(
      new AppError('Article not found', 404)
    );
  });

  it.each(['Draft', 'Pending', 'Unpublished'])(
    'should throw AppError 400 if article status is %s',
    async (status) => {
      (ArticleRepository.findById as jest.Mock<any>).mockResolvedValue({
        ...publishedArticle,
        status,
      });

      await expect(QuizService.generateQuiz(articleId)).rejects.toThrow(
        new AppError('Quiz can only be generated for Published articles', 400)
      );
    }
  );

  it('should throw AppError 422 if the article body has no text', async () => {
    (ArticleRepository.findById as jest.Mock<any>).mockResolvedValue({
      ...publishedArticle,
      body: { type: 'doc', content: [] },
    });

    await expect(QuizService.generateQuiz(articleId)).rejects.toThrow(
      new AppError('Article has no content to generate a quiz from', 422)
    );
    expect(FoundryClient.generateQuestions).not.toHaveBeenCalled();
    expect(QuizRepository.findLatestFallbackByArticleId).not.toHaveBeenCalled();
  });

  it('should generate, persist, and return questions without correct answers', async () => {
    (ArticleRepository.findById as jest.Mock<any>).mockResolvedValue(
      publishedArticle
    );
    (FoundryClient.generateQuestions as jest.Mock<any>).mockResolvedValue(
      makeGeneratedQuestions()
    );
    (QuizRepository.create as jest.Mock<any>).mockResolvedValue(
      makeStoredQuiz(false)
    );

    const result = await QuizService.generateQuiz(articleId);

    expect(FoundryClient.generateQuestions).toHaveBeenCalledWith(
      expect.objectContaining({
        articleTitle: 'Test Article',
        questionCount: DEFAULT_QUESTION_COUNT,
      })
    );
    expect(QuizRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ articleId, isFallback: false })
    );

    expect(result.quizId).toBe('quiz-1');
    expect(result.isFallback).toBe(false);
    expect(result.questions).toHaveLength(DEFAULT_QUESTION_COUNT);
    for (const question of result.questions) {
      expect(question).not.toHaveProperty('correctIndexes');
      expect(question).not.toHaveProperty('explanation');
    }
  });

  it('should serve the stored fallback quiz when the workflow output is invalid', async () => {
    (ArticleRepository.findById as jest.Mock<any>).mockResolvedValue(
      publishedArticle
    );
    (FoundryClient.generateQuestions as jest.Mock<any>).mockResolvedValue(
      'this is not json {'
    );
    (
      QuizRepository.findLatestFallbackByArticleId as jest.Mock<any>
    ).mockResolvedValue(makeStoredQuiz(true));

    const result = await QuizService.generateQuiz(articleId);

    expect(result.isFallback).toBe(true);
    expect(result.questions).toHaveLength(DEFAULT_QUESTION_COUNT);
    expect(QuizRepository.create).not.toHaveBeenCalled();
  });

  it('should serve the stored fallback quiz when the workflow call fails', async () => {
    (ArticleRepository.findById as jest.Mock<any>).mockResolvedValue(
      publishedArticle
    );
    (FoundryClient.generateQuestions as jest.Mock<any>).mockRejectedValue(
      new AppError('Failed to reach the quiz workflow', 502)
    );
    (
      QuizRepository.findLatestFallbackByArticleId as jest.Mock<any>
    ).mockResolvedValue(makeStoredQuiz(true));

    const result = await QuizService.generateQuiz(articleId);

    expect(result.isFallback).toBe(true);
  });

  it('should rethrow the workflow error when no fallback quiz exists', async () => {
    (ArticleRepository.findById as jest.Mock<any>).mockResolvedValue(
      publishedArticle
    );
    (FoundryClient.generateQuestions as jest.Mock<any>).mockRejectedValue(
      new AppError('Quiz workflow request timed out', 504)
    );
    (
      QuizRepository.findLatestFallbackByArticleId as jest.Mock<any>
    ).mockResolvedValue(null);

    await expect(QuizService.generateQuiz(articleId)).rejects.toThrow(
      new AppError('Quiz workflow request timed out', 504)
    );
  });
});

describe('QuizService.pregenerateFallbackQuiz', () => {
  it('should persist a fallback quiz for a published article', async () => {
    (ArticleRepository.findById as jest.Mock<any>).mockResolvedValue(
      publishedArticle
    );
    (FoundryClient.generateQuestions as jest.Mock<any>).mockResolvedValue(
      makeGeneratedQuestions()
    );
    (QuizRepository.create as jest.Mock<any>).mockResolvedValue(
      makeStoredQuiz(true)
    );

    await QuizService.pregenerateFallbackQuiz(articleId);

    expect(QuizRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ articleId, isFallback: true })
    );
  });

  it('should swallow errors instead of throwing', async () => {
    (ArticleRepository.findById as jest.Mock<any>).mockResolvedValue(
      publishedArticle
    );
    (FoundryClient.generateQuestions as jest.Mock<any>).mockRejectedValue(
      new AppError('Failed to reach the quiz workflow', 502)
    );

    await expect(
      QuizService.pregenerateFallbackQuiz(articleId)
    ).resolves.toBeUndefined();
    expect(QuizRepository.create).not.toHaveBeenCalled();
  });
});
