import React from 'react';
import { render, screen } from '@testing-library/react';
import { QuizResultScreen } from '../QuizResultScreen';
import type { QuizSubmitResponse } from '@/lib/api/articles';

const result: QuizSubmitResponse = {
  quizId: 'quiz-1',
  articleId: 'article-123',
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
};

describe('QuizResultScreen', () => {
  it('shows the overall score summary', () => {
    render(<QuizResultScreen result={result} />);

    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(
      screen.getByText('1 correct, 1 incorrect out of 2 questions')
    ).toBeInTheDocument();
  });

  it('marks each question as correct or incorrect', () => {
    render(<QuizResultScreen result={result} />);

    expect(screen.getByText('Correct')).toBeInTheDocument();
    expect(screen.getByText('Incorrect')).toBeInTheDocument();
  });

  it('reveals the correct answer for a missed question', () => {
    render(<QuizResultScreen result={result} />);

    const correctLabels = screen.getAllByText('Correct answer');
    expect(correctLabels.length).toBeGreaterThan(0);
    expect(screen.getByText('Your answer')).toBeInTheDocument();
  });
});
