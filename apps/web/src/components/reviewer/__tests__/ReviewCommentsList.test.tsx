import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReviewCommentsList } from '../ReviewCommentsList';
import { type ReviewComment } from '@/lib/api/reviewer.api';
import '@testing-library/jest-dom';

describe('ReviewCommentsList', () => {
  const mockOnClickComment = jest.fn();
  const mockOnUpdateCommentStatus = jest.fn();

  const mockComments: ReviewComment[] = [
    {
      id: 'comment-1',
      reviewId: 'review-123',
      comment: 'Please check this sentence structure.',
      selectedText: 'container orchestration platform',
      anchorData: { from: 10, to: 42 },
      status: 'Open',
      createdBy: 'rev-1',
      createdAt: '2026-01-15T12:00:00.000Z',
      updatedAt: '2026-01-15T12:00:00.000Z',
    },
    {
      id: 'comment-2',
      reviewId: 'review-123',
      comment: 'This terminology is correct.',
      selectedText: 'deployment configurations',
      anchorData: { from: 55, to: 80 },
      status: 'Resolved',
      createdBy: 'rev-1',
      createdAt: '2026-01-15T12:10:00.000Z',
      updatedAt: '2026-01-15T12:15:00.000Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a list of comments correctly with active status', async () => {
    render(
      <ReviewCommentsList
        comments={mockComments}
        activeCommentId="comment-1"
        onClickComment={mockOnClickComment}
        onUpdateCommentStatus={mockOnUpdateCommentStatus}
      />
    );

    expect(screen.getByText('Review Comments')).toBeInTheDocument();
    expect(screen.getByText('Please check this sentence structure.')).toBeInTheDocument();
    expect(screen.getByText('This terminology is correct.')).toBeInTheDocument();

    // Check quotes are rendered
    expect(screen.getByText(/container orchestration platform/i)).toBeInTheDocument();
    expect(screen.getByText(/deployment configurations/i)).toBeInTheDocument();

    // Check status values
    expect(screen.getByTestId('comment-status-comment-1')).toHaveTextContent('Open');
    expect(screen.getByTestId('comment-status-comment-2')).toHaveTextContent('Resolved');

    const user = userEvent.setup();
    // Clicking card triggers callback
    await user.click(screen.getByTestId('comment-item-comment-1'));
    expect(mockOnClickComment).toHaveBeenCalledWith('comment-1');

    // Click Resolve updates status
    await user.click(screen.getByTestId('resolve-comment-comment-1'));
    expect(mockOnUpdateCommentStatus).toHaveBeenCalledWith('comment-1', 'Resolved');

    // Click Reopen updates status
    await user.click(screen.getByTestId('reopen-comment-comment-2'));
    expect(mockOnUpdateCommentStatus).toHaveBeenCalledWith('comment-2', 'Open');
  });

  it('returns null (empty render) when no comments exist', () => {
    const { container } = render(
      <ReviewCommentsList
        comments={[]}
        onClickComment={mockOnClickComment}
        onUpdateCommentStatus={mockOnUpdateCommentStatus}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});
