import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommentPopover } from '../CommentPopover';
import '@testing-library/jest-dom';

describe('CommentPopover', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();
  const defaultCoords = { top: 100, left: 200 };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders selected-text preview and handles cancel click', async () => {
    render(
      <CommentPopover
        isOpen={true}
        selectedText="container orchestration platform"
        coords={defaultCoords}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText(/container orchestration platform/i)).toBeInTheDocument();
    expect(screen.getByTestId('comment-textarea')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('validates non-empty comment before allowing submit', async () => {
    render(
      <CommentPopover
        isOpen={true}
        selectedText="container orchestration platform"
        coords={defaultCoords}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const user = userEvent.setup();
    await user.click(screen.getByTestId('submit-comment-button'));

    expect(screen.getByTestId('comment-error')).toHaveTextContent('Comment cannot be empty');
    expect(mockOnSubmit).not.toHaveBeenCalled();

    // Type something and submit
    await user.type(screen.getByTestId('comment-textarea'), 'Valid comment feedback');
    await user.click(screen.getByTestId('submit-comment-button'));

    expect(mockOnSubmit).toHaveBeenCalledWith('Valid comment feedback');
  });
});
