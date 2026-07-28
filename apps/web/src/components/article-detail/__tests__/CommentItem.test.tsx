import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CommentWithAuthor } from '@/lib/api/comments';

jest.mock('gsap', () => ({
  __esModule: true,
  default: { registerPlugin: jest.fn(), to: jest.fn(), fromTo: jest.fn() },
}));

jest.mock('@gsap/react', () => ({
  useGSAP: jest.fn(),
}));

import { CommentItem } from '@/components/article-detail/CommentItem';

function makeComment(
  overrides: Partial<CommentWithAuthor> = {}
): CommentWithAuthor {
  return {
    id: 'c1',
    articleId: 'a1',
    createdBy: 'test-user-1',
    body: 'Great article!',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorName: 'Test User',
    authorImage: null,
    ...overrides,
  };
}

describe('CommentItem', () => {
  it('renders the author, body, and time-ago label', () => {
    render(
      <CommentItem
        comment={makeComment()}
        currentUserId="someone-else"
        onDelete={jest.fn()}
        onEdit={jest.fn()}
      />
    );

    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('Great article!')).toBeInTheDocument();
  });

  it('does not show edit or delete buttons for comments the current user does not own', () => {
    render(
      <CommentItem
        comment={makeComment({ createdBy: 'other-user' })}
        currentUserId="test-user-1"
        onDelete={jest.fn()}
        onEdit={jest.fn()}
      />
    );

    expect(screen.queryByTestId('edit-comment-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('delete-comment-btn')).not.toBeInTheDocument();
  });

  it("shows edit and delete buttons for the current user's own comment", () => {
    render(
      <CommentItem
        comment={makeComment({ createdBy: 'test-user-1' })}
        currentUserId="test-user-1"
        onDelete={jest.fn()}
        onEdit={jest.fn()}
      />
    );

    expect(screen.getByTestId('edit-comment-btn')).toBeInTheDocument();
    expect(screen.getByTestId('delete-comment-btn')).toBeInTheDocument();
  });

  describe('delete flow', () => {
    it('opens the confirmation modal and calls onDelete when confirmed', async () => {
      const onDelete = jest.fn().mockResolvedValueOnce(undefined);
      const user = userEvent.setup();

      render(
        <CommentItem
          comment={makeComment({ createdBy: 'test-user-1' })}
          currentUserId="test-user-1"
          onDelete={onDelete}
          onEdit={jest.fn()}
        />
      );

      await user.click(screen.getByTestId('delete-comment-btn'));
      expect(screen.getByText('Delete this comment?')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Delete' }));

      await waitFor(() => expect(onDelete).toHaveBeenCalledWith('c1'));
    });

    it('keeps the modal open and shows an error when onDelete rejects', async () => {
      const onDelete = jest
        .fn()
        .mockRejectedValueOnce(
          new Error('Only the comment owner can delete this comment')
        );
      const user = userEvent.setup();

      render(
        <CommentItem
          comment={makeComment({ createdBy: 'test-user-1' })}
          currentUserId="test-user-1"
          onDelete={onDelete}
          onEdit={jest.fn()}
        />
      );

      await user.click(screen.getByTestId('delete-comment-btn'));
      await user.click(screen.getByRole('button', { name: 'Delete' }));

      await waitFor(() =>
        expect(
          screen.getByText('Only the comment owner can delete this comment')
        ).toBeInTheDocument()
      );
    });
  });

  describe('edit flow', () => {
    it('shows a pre-filled textarea when Edit is clicked', async () => {
      const user = userEvent.setup();

      render(
        <CommentItem
          comment={makeComment({ createdBy: 'test-user-1' })}
          currentUserId="test-user-1"
          onDelete={jest.fn()}
          onEdit={jest.fn()}
        />
      );

      await user.click(screen.getByTestId('edit-comment-btn'));

      expect(screen.getByTestId('edit-comment-input')).toHaveValue(
        'Great article!'
      );
    });

    it('calls onEdit with the trimmed draft and exits edit mode on success', async () => {
      const onEdit = jest.fn().mockResolvedValueOnce(undefined);
      const user = userEvent.setup();

      render(
        <CommentItem
          comment={makeComment({ createdBy: 'test-user-1' })}
          currentUserId="test-user-1"
          onDelete={jest.fn()}
          onEdit={onEdit}
        />
      );

      await user.click(screen.getByTestId('edit-comment-btn'));
      const textarea = screen.getByTestId('edit-comment-input');
      await user.clear(textarea);
      await user.type(textarea, '  Updated text  ');
      await user.click(screen.getByTestId('save-edit-comment-btn'));

      await waitFor(() =>
        expect(onEdit).toHaveBeenCalledWith('c1', 'Updated text')
      );
      await waitFor(() =>
        expect(
          screen.queryByTestId('edit-comment-input')
        ).not.toBeInTheDocument()
      );
    });

    it('keeps the textarea open and shows an error when onEdit rejects', async () => {
      const onEdit = jest
        .fn()
        .mockRejectedValueOnce(
          new Error('Only the comment owner can edit this comment')
        );
      const user = userEvent.setup();

      render(
        <CommentItem
          comment={makeComment({ createdBy: 'test-user-1' })}
          currentUserId="test-user-1"
          onDelete={jest.fn()}
          onEdit={onEdit}
        />
      );

      await user.click(screen.getByTestId('edit-comment-btn'));
      const textarea = screen.getByTestId('edit-comment-input');
      await user.clear(textarea);
      await user.type(textarea, 'Updated text');
      await user.click(screen.getByTestId('save-edit-comment-btn'));

      await waitFor(() =>
        expect(screen.getByTestId('edit-comment-error')).toHaveTextContent(
          'Only the comment owner can edit this comment'
        )
      );
      expect(screen.getByTestId('edit-comment-input')).toHaveValue(
        'Updated text'
      );
    });

    it('discards the draft and exits edit mode on cancel without calling onEdit', async () => {
      const onEdit = jest.fn();
      const user = userEvent.setup();

      render(
        <CommentItem
          comment={makeComment({ createdBy: 'test-user-1' })}
          currentUserId="test-user-1"
          onDelete={jest.fn()}
          onEdit={onEdit}
        />
      );

      await user.click(screen.getByTestId('edit-comment-btn'));
      const textarea = screen.getByTestId('edit-comment-input');
      await user.clear(textarea);
      await user.type(textarea, 'Some draft');
      await user.click(screen.getByTestId('cancel-edit-comment-btn'));

      expect(onEdit).not.toHaveBeenCalled();
      expect(
        screen.queryByTestId('edit-comment-input')
      ).not.toBeInTheDocument();
      expect(screen.getByText('Great article!')).toBeInTheDocument();
    });
  });
});
