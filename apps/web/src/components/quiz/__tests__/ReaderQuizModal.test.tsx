import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockGenerateQuiz = jest.fn();
const mockSubmitQuiz = jest.fn();

jest.mock('@/lib/api/articles', () => ({
  generateQuiz: (...args: unknown[]) => mockGenerateQuiz(...args),
  submitQuiz: (...args: unknown[]) => mockSubmitQuiz(...args),
}));

jest.mock('gsap', () => ({
  __esModule: true,
  default: { to: jest.fn(), fromTo: jest.fn() },
}));

jest.mock('@gsap/react', () => ({
  useGSAP: jest.fn(),
}));

import { ReaderQuizModal } from '../ReaderQuizModal';

const articleId = 'article-123';

const mockQuestions = [
  { id: 'q1', question: 'What is 1 + 1?', type: 'single_choice' as const, options: ['1', '2'] },
  { id: 'q2', question: 'Pick primes', type: 'multiple_choice' as const, options: ['2', '3', '4'] },
];

describe('ReaderQuizModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateQuiz.mockResolvedValue({
      quizId: 'quiz-1',
      articleId,
      isFallback: false,
      questions: mockQuestions,
    });
  });

  it('steps through questions with the progress bar advancing, then shows a preview of the selections', async () => {
    const user = userEvent.setup();

    render(<ReaderQuizModal isOpen articleId={articleId} onClose={jest.fn()} />);

    expect(await screen.findByText('Question 1 of 2')).toBeInTheDocument();

    await user.click(screen.getByText('2'));
    await user.click(screen.getByRole('button', { name: /next/i }));

    expect(await screen.findByText('Question 2 of 2')).toBeInTheDocument();

    await user.click(screen.getByText('3'));
    await user.click(screen.getByRole('button', { name: /review answers/i }));

    expect(await screen.findByText('Review your answers')).toBeInTheDocument();
    expect(screen.getByText('What is 1 + 1?')).toBeInTheDocument();
    expect(screen.getByText('Pick primes')).toBeInTheDocument();
  });

  it('asks for confirmation before submitting, then shows graded results', async () => {
    const user = userEvent.setup();
    mockSubmitQuiz.mockResolvedValue({
      quizId: 'quiz-1',
      articleId,
      totalQuestions: 2,
      correctCount: 1,
      incorrectCount: 1,
      scorePercent: 50,
      results: [
        {
          id: 'q1',
          question: 'What is 1 + 1?',
          type: 'single_choice',
          options: ['1', '2'],
          selected: [1],
          correctIndexes: [1],
          isCorrect: true,
        },
        {
          id: 'q2',
          question: 'Pick primes',
          type: 'multiple_choice',
          options: ['2', '3', '4'],
          selected: [2],
          correctIndexes: [0, 1],
          isCorrect: false,
        },
      ],
    });

    render(<ReaderQuizModal isOpen articleId={articleId} onClose={jest.fn()} />);

    await screen.findByText('Question 1 of 2');
    await user.click(screen.getByText('2'));
    await user.click(screen.getByRole('button', { name: /next/i }));

    await screen.findByText('Question 2 of 2');
    await user.click(screen.getByText('3'));
    await user.click(screen.getByRole('button', { name: /review answers/i }));

    await screen.findByText('Review your answers');
    await user.click(screen.getByRole('button', { name: /^submit$/i }));

    expect(await screen.findByText('Submit your answers?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /confirm submit/i }));

    expect(mockSubmitQuiz).toHaveBeenCalledWith(articleId, 'quiz-1', {
      q1: [1],
      q2: [1],
    });
    expect(await screen.findByText('50%')).toBeInTheDocument();
  });

  it('shows an error message if quiz generation fails', async () => {
    mockGenerateQuiz.mockRejectedValue(new Error('Failed to reach Local LLM'));

    render(<ReaderQuizModal isOpen articleId={articleId} onClose={jest.fn()} />);

    expect(await screen.findByText('Failed to reach Local LLM')).toBeInTheDocument();
  });

  it('does not call generateQuiz when closed', () => {
    render(<ReaderQuizModal isOpen={false} articleId={null} onClose={jest.fn()} />);
    expect(mockGenerateQuiz).not.toHaveBeenCalled();
  });
});
