import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockGenerateQuiz = jest.fn();
const mockGetFocusAspects = jest.fn();
const mockSetFocusAspects = jest.fn();

jest.mock('@/lib/api/articles', () => ({
  generateQuiz: (...args: unknown[]) => mockGenerateQuiz(...args),
  getFocusAspects: (...args: unknown[]) => mockGetFocusAspects(...args),
  setFocusAspects: (...args: unknown[]) => mockSetFocusAspects(...args),
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
  questions: [{ question: 'What is 1 + 1?', options: ['1', '2'], correctIndex: 1 }],
};

describe('GenerateQuizModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetFocusAspects.mockResolvedValue(null);
  });

  describe('author mode (autoGenerate=false)', () => {
    it('loads the saved focus-aspects hint and shows the input step when opened', async () => {
      mockGetFocusAspects.mockResolvedValue('prioritize security section');

      render(
        <GenerateQuizModal isOpen articleId={articleId} onClose={jest.fn()} />
      );

      await waitFor(() => {
        expect(mockGetFocusAspects).toHaveBeenCalledWith(articleId);
      });

      const textarea = await screen.findByDisplayValue(
        'prioritize security section'
      );
      expect(textarea).toBeInTheDocument();
      expect(mockGenerateQuiz).not.toHaveBeenCalled();
    });

    it('saves focus aspects then generates the quiz and shows the result on Generate', async () => {
      const user = userEvent.setup();
      mockSetFocusAspects.mockResolvedValue('emphasize auth flow');
      mockGenerateQuiz.mockResolvedValue(mockQuizResponse);

      render(
        <GenerateQuizModal isOpen articleId={articleId} onClose={jest.fn()} />
      );

      await waitFor(() => expect(mockGetFocusAspects).toHaveBeenCalled());

      const textarea = screen.getByLabelText(/focus aspects/i);
      await user.type(textarea, 'emphasize auth flow');

      await user.click(screen.getByRole('button', { name: /^generate$/i }));

      await waitFor(() => {
        expect(mockSetFocusAspects).toHaveBeenCalledWith(
          articleId,
          'emphasize auth flow'
        );
      });
      expect(mockGenerateQuiz).toHaveBeenCalledWith(articleId);

      expect(
        await screen.findByText(/raw response \(for verification only\)/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/"quizId": "quiz-1"/)).toBeInTheDocument();
    });

    it('shows an error message if generation fails', async () => {
      const user = userEvent.setup();
      mockGenerateQuiz.mockRejectedValue(new Error('LLM unavailable'));

      render(
        <GenerateQuizModal isOpen articleId={articleId} onClose={jest.fn()} />
      );

      await waitFor(() => expect(mockGetFocusAspects).toHaveBeenCalled());
      await user.click(screen.getByRole('button', { name: /^generate$/i }));

      expect(await screen.findByText('LLM unavailable')).toBeInTheDocument();
    });

    it('calls onClose when Cancel is clicked', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();

      render(
        <GenerateQuizModal isOpen articleId={articleId} onClose={onClose} />
      );

      await waitFor(() => expect(mockGetFocusAspects).toHaveBeenCalled());
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('reader mode (autoGenerate=true)', () => {
    it('generates the quiz automatically without loading or saving focus aspects', async () => {
      mockGenerateQuiz.mockResolvedValue(mockQuizResponse);

      render(
        <GenerateQuizModal
          isOpen
          articleId={articleId}
          onClose={jest.fn()}
          autoGenerate
        />
      );

      await waitFor(() => expect(mockGenerateQuiz).toHaveBeenCalledWith(articleId));

      expect(mockGetFocusAspects).not.toHaveBeenCalled();
      expect(mockSetFocusAspects).not.toHaveBeenCalled();
      expect(
        await screen.findByText(/raw response \(for verification only\)/i)
      ).toBeInTheDocument();

      // No focus-aspects input and no manual Generate button in reader mode
      expect(screen.queryByLabelText(/focus aspects/i)).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /^generate$/i })
      ).not.toBeInTheDocument();
    });

    it('only triggers generation once even if the component re-renders while open', async () => {
      mockGenerateQuiz.mockResolvedValue(mockQuizResponse);
      const onClose = jest.fn();

      const { rerender } = render(
        <GenerateQuizModal
          isOpen
          articleId={articleId}
          onClose={onClose}
          autoGenerate
        />
      );

      await waitFor(() => expect(mockGenerateQuiz).toHaveBeenCalledTimes(1));

      rerender(
        <GenerateQuizModal
          isOpen
          articleId={articleId}
          onClose={onClose}
          autoGenerate
        />
      );

      expect(mockGenerateQuiz).toHaveBeenCalledTimes(1);
    });

    it('shows an error message if automatic generation fails', async () => {
      mockGenerateQuiz.mockRejectedValue(new Error('Failed to reach Local LLM'));

      render(
        <GenerateQuizModal
          isOpen
          articleId={articleId}
          onClose={jest.fn()}
          autoGenerate
        />
      );

      expect(
        await screen.findByText('Failed to reach Local LLM')
      ).toBeInTheDocument();
    });

    it('only shows a Close button in the footer', async () => {
      mockGenerateQuiz.mockResolvedValue(mockQuizResponse);

      render(
        <GenerateQuizModal
          isOpen
          articleId={articleId}
          onClose={jest.fn()}
          autoGenerate
        />
      );

      await waitFor(() =>
        expect(
          screen.getByRole('button', { name: /^close$/i })
        ).toBeInTheDocument()
      );
      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
    });
  });

  it('does not render anything when isOpen is false and articleId is null', () => {
    render(<GenerateQuizModal isOpen={false} articleId={null} onClose={jest.fn()} />);

    expect(mockGenerateQuiz).not.toHaveBeenCalled();
    expect(mockGetFocusAspects).not.toHaveBeenCalled();
  });
});
