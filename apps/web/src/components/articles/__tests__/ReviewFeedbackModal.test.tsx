import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReviewFeedbackModal } from '../ReviewFeedbackModal';

const mockGetReviewFeedback = jest.fn();

jest.mock('@/lib/api/articles', () => ({
  getReviewFeedback: (articleId: string) => mockGetReviewFeedback(articleId),
}));

describe('ReviewFeedbackModal', () => {
  const defaultProps = {
    isOpen: true,
    articleId: 'art-123',
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when isOpen is false or articleId is null', () => {
    const { rerender } = render(
      <ReviewFeedbackModal {...defaultProps} isOpen={false} />
    );
    expect(screen.queryByTestId('review-feedback-modal')).not.toBeInTheDocument();

    rerender(<ReviewFeedbackModal {...defaultProps} articleId={null} />);
    expect(screen.queryByTestId('review-feedback-modal')).not.toBeInTheDocument();
  });

  it('displays loading state while fetching feedback', () => {
    mockGetReviewFeedback.mockReturnValue(new Promise(() => {}));

    render(<ReviewFeedbackModal {...defaultProps} />);

    expect(screen.getByTestId('review-feedback-modal')).toBeInTheDocument();
    expect(screen.getByTestId('review-feedback-loading')).toHaveTextContent(
      'Loading feedback...'
    );
  });

  it('displays error message when API call fails', async () => {
    mockGetReviewFeedback.mockRejectedValueOnce(new Error('Article not found'));

    render(<ReviewFeedbackModal {...defaultProps} />);

    expect(await screen.findByTestId('review-feedback-error')).toHaveTextContent(
      'Article not found'
    );
  });

  it('renders overall feedback and inline comments on success', async () => {
    mockGetReviewFeedback.mockResolvedValueOnce({
      overallFeedback: 'Please improve technical detail and fix formatting.',
      comments: [
        {
          id: 'c1',
          comment: 'Clarify this paragraph.',
          selectedText: 'Some selected text snippet',
          createdAt: '2026-09-07T12:00:00Z',
        },
        {
          id: 'c2',
          comment: 'Check for typos.',
          selectedText: null,
          createdAt: '2026-09-07T12:05:00Z',
        },
      ],
    });

    render(<ReviewFeedbackModal {...defaultProps} />);

    expect(await screen.findByTestId('overall-feedback-section')).toBeInTheDocument();
    expect(
      screen.getByText('Please improve technical detail and fix formatting.')
    ).toBeInTheDocument();

    expect(screen.getByTestId('inline-comments-section')).toHaveTextContent(
      'Inline Comments (2)'
    );
    expect(screen.getByText('“Some selected text snippet”')).toBeInTheDocument();
    expect(screen.getByText('Clarify this paragraph.')).toBeInTheDocument();
    expect(screen.getByText('Check for typos.')).toBeInTheDocument();
  });

  it('displays fallback when overall feedback is empty', async () => {
    mockGetReviewFeedback.mockResolvedValueOnce({
      overallFeedback: null,
      comments: [],
    });

    render(<ReviewFeedbackModal {...defaultProps} />);

    expect(await screen.findByTestId('overall-feedback-section')).toHaveTextContent(
      'No overall feedback provided.'
    );
    expect(screen.getByTestId('inline-comments-section')).toHaveTextContent(
      'No inline comments.'
    );
  });

  it('calls onClose when Close button or X is clicked', async () => {
    mockGetReviewFeedback.mockResolvedValueOnce({
      overallFeedback: 'Looks okay.',
      comments: [],
    });

    const user = userEvent.setup();
    render(<ReviewFeedbackModal {...defaultProps} />);

    await screen.findByTestId('overall-feedback-section');

    const closeBtn = screen.getByTestId('close-feedback-modal-button');
    await user.click(closeBtn);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);

    const xBtn = screen.getByTestId('close-feedback-modal-x');
    await user.click(xBtn);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(2);
  });
});
