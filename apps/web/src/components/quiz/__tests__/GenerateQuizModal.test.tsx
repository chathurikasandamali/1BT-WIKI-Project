import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockGenerateQuiz = jest.fn();
const mockGetFocusAspects = jest.fn();
const mockSetFocusAspects = jest.fn();
const mockSaveQuizAsFallback = jest.fn();

jest.mock('@/lib/api/articles', () => ({
  generateQuiz: (...args: unknown[]) => mockGenerateQuiz(...args),
  getFocusAspects: (...args: unknown[]) => mockGetFocusAspects(...args),
  setFocusAspects: (...args: unknown[]) => mockSetFocusAspects(...args),
  saveQuizAsFallback: (...args: unknown[]) => mockSaveQuizAsFallback(...args),
}));

jest.mock('gsap', () => ({
  __esModule: true,
  default: { to: jest.fn(), fromTo: jest.fn() },
}));

jest.mock('@gsap/react', () => ({
  useGSAP: jest.fn(),
}));

import { GenerateQuizModal } from '../GenerateQuizModal';

const articleId = 'article-123';

const mockQuizResponse = {
  quizId: 'quiz-1',
  articleId,
  isFallback: false,
  questions: [
    { id: 'q1', question: 'What is 1 + 1?', type: 'single_choice' as const, options: ['1', '2'] },
  ],
};

describe('GenerateQuizModal (author review)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetFocusAspects.mockResolvedValue(null);
  });

  it('generates a quiz and shows the question review list', async () => {
    const user = userEvent.setup();
    mockGenerateQuiz.mockResolvedValue(mockQuizResponse);

    render(<GenerateQuizModal isOpen articleId={articleId} onClose={jest.fn()} />);

    await waitFor(() => expect(mockGetFocusAspects).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: /^generate$/i }));

    expect(await screen.findByText('What is 1 + 1?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^save$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /regenerate/i })).toBeInTheDocument();
  });

  it('saves the reviewed quiz as the fallback quiz', async () => {
    const user = userEvent.setup();
    mockGenerateQuiz.mockResolvedValue(mockQuizResponse);
    mockSaveQuizAsFallback.mockResolvedValue(mockQuizResponse);

    render(<GenerateQuizModal isOpen articleId={articleId} onClose={jest.fn()} />);

    await waitFor(() => expect(mockGetFocusAspects).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: /^generate$/i }));
    await screen.findByText('What is 1 + 1?');

    await user.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(mockSaveQuizAsFallback).toHaveBeenCalledWith(articleId, 'quiz-1');
    });
    expect(await screen.findByText(/saved as the article's fallback quiz/i)).toBeInTheDocument();
  });

  it('returns to the editable focus-aspects step on Regenerate', async () => {
    const user = userEvent.setup();
    mockGenerateQuiz.mockResolvedValue(mockQuizResponse);

    render(<GenerateQuizModal isOpen articleId={articleId} onClose={jest.fn()} />);

    await waitFor(() => expect(mockGetFocusAspects).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: /^generate$/i }));
    await screen.findByText('What is 1 + 1?');

    await user.click(screen.getByRole('button', { name: /regenerate/i }));

    expect(screen.getByLabelText(/focus aspects/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^generate$/i })).toBeInTheDocument();
  });

  it('shows an error message if generation fails', async () => {
    const user = userEvent.setup();
    mockGenerateQuiz.mockRejectedValue(new Error('LLM unavailable'));

    render(<GenerateQuizModal isOpen articleId={articleId} onClose={jest.fn()} />);

    await waitFor(() => expect(mockGetFocusAspects).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: /^generate$/i }));

    expect(await screen.findByText('LLM unavailable')).toBeInTheDocument();
  });
});
