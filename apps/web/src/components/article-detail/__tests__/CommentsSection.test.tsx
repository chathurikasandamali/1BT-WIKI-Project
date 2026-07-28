import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CommentWithAuthor, Comment } from '@/lib/api/comments';

const mockFetchComments = jest.fn();
const mockPostComment = jest.fn();
const mockUpdateComment = jest.fn();
const mockDeleteComment = jest.fn();

jest.mock('@/lib/api/comments', () => ({
  fetchComments: (...args: unknown[]) => mockFetchComments(...args),
  postComment: (...args: unknown[]) => mockPostComment(...args),
  updateComment: (...args: unknown[]) => mockUpdateComment(...args),
  deleteComment: (...args: unknown[]) => mockDeleteComment(...args),
}));

const mockUseUser = jest.fn();

jest.mock('@/lib/hooks/useUser', () => ({
  useUser: () => mockUseUser(),
}));

jest.mock('gsap', () => ({
  __esModule: true,
  default: { registerPlugin: jest.fn(), to: jest.fn(), fromTo: jest.fn() },
}));

jest.mock('@gsap/react', () => ({
  useGSAP: jest.fn(),
}));

import { CommentsSection } from '@/components/article-detail/CommentsSection';

function makeComment(
  overrides: Partial<CommentWithAuthor> = {}
): CommentWithAuthor {
  return {
    id: 'c1',
    articleId: 'a1',
    createdBy: 'other-user',
    body: 'Great article!',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    authorName: 'Other User',
    authorImage: null,
    ...overrides,
  };
}

const currentUser = {
  id: 'test-user-1',
  name: 'Test User',
  email: 'test@1billiontech.com',
  avatarUrl: null,
  role: 'User' as const,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('CommentsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUser.mockReturnValue({
      user: currentUser,
      loading: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  it('shows a loading state while fetching', () => {
    mockFetchComments.mockReturnValue(new Promise(() => {}));

    render(<CommentsSection articleId="a1" />);

    expect(screen.getByTestId('comments-loading')).toBeInTheDocument();
  });

  it('shows an error state when fetching fails', async () => {
    mockFetchComments.mockRejectedValueOnce(new Error('Network down'));

    render(<CommentsSection articleId="a1" />);

    expect(await screen.findByTestId('comments-error')).toHaveTextContent(
      'Network down'
    );
  });

  it('shows an empty state when there are no comments', async () => {
    mockFetchComments.mockResolvedValueOnce([]);

    render(<CommentsSection articleId="a1" />);

    expect(await screen.findByTestId('comments-empty')).toHaveTextContent(
      'No comments yet. Be the first to share your thoughts!'
    );
  });

  it('renders the fetched comments', async () => {
    mockFetchComments.mockResolvedValueOnce([
      makeComment({ id: 'c1', authorName: 'Other User' }),
      makeComment({ id: 'c2', authorName: 'Another User' }),
    ]);

    render(<CommentsSection articleId="a1" />);

    const list = await screen.findByTestId('comments-list');
    expect(within(list).getByText('Other User')).toBeInTheDocument();
    expect(within(list).getByText('Another User')).toBeInTheDocument();
    expect(screen.getByText('Comments (2)')).toBeInTheDocument();
  });

  it("only shows edit/delete controls on the current user's own comment", async () => {
    mockFetchComments.mockResolvedValueOnce([
      makeComment({ id: 'mine', createdBy: 'test-user-1' }),
      makeComment({ id: 'theirs', createdBy: 'other-user' }),
    ]);

    render(<CommentsSection articleId="a1" />);
    await screen.findByTestId('comments-list');

    const deleteButtons = screen.getAllByTestId('delete-comment-btn');
    expect(deleteButtons).toHaveLength(1);
  });

  it('posts a new comment and prepends it to the list', async () => {
    mockFetchComments.mockResolvedValueOnce([]);
    const created: Comment = {
      id: 'new-1',
      articleId: 'a1',
      createdBy: 'test-user-1',
      body: 'My new comment',
      createdAt: '2026-01-10T00:00:00.000Z',
      updatedAt: '2026-01-10T00:00:00.000Z',
    };
    mockPostComment.mockResolvedValueOnce(created);
    const user = userEvent.setup();

    render(<CommentsSection articleId="a1" />);
    await screen.findByTestId('comments-empty');

    await user.type(
      screen.getByPlaceholderText('Add a comment...'),
      'My new comment'
    );
    await user.click(screen.getByRole('button', { name: 'Post Comment' }));

    await waitFor(() =>
      expect(mockPostComment).toHaveBeenCalledWith('a1', 'My new comment')
    );
    expect(await screen.findByText('My new comment')).toBeInTheDocument();
  });

  it('shows an error and keeps the draft when posting fails', async () => {
    mockFetchComments.mockResolvedValueOnce([]);
    mockPostComment.mockRejectedValueOnce(
      new Error('Comment cannot exceed 5000 characters')
    );
    const user = userEvent.setup();

    render(<CommentsSection articleId="a1" />);
    await screen.findByTestId('comments-empty');

    await user.type(
      screen.getByPlaceholderText('Add a comment...'),
      'Too long'
    );
    await user.click(screen.getByRole('button', { name: 'Post Comment' }));

    expect(await screen.findByTestId('post-comment-error')).toHaveTextContent(
      'Comment cannot exceed 5000 characters'
    );
    expect(screen.getByPlaceholderText('Add a comment...')).toHaveValue(
      'Too long'
    );
  });

  it('deletes a comment and removes it from the list on success', async () => {
    mockFetchComments.mockResolvedValueOnce([
      makeComment({ id: 'mine', createdBy: 'test-user-1' }),
    ]);
    mockDeleteComment.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();

    render(<CommentsSection articleId="a1" />);
    await screen.findByTestId('comments-list');

    await user.click(screen.getByTestId('delete-comment-btn'));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() =>
      expect(mockDeleteComment).toHaveBeenCalledWith('a1', 'mine')
    );
    await waitFor(() =>
      expect(screen.getByTestId('comments-empty')).toBeInTheDocument()
    );
  });

  it('keeps the comment and shows an error toast when deleting fails', async () => {
    mockFetchComments.mockResolvedValueOnce([
      makeComment({ id: 'mine', createdBy: 'test-user-1' }),
    ]);
    mockDeleteComment.mockRejectedValueOnce(
      new Error('Only the comment owner can delete this comment')
    );
    const user = userEvent.setup();

    render(<CommentsSection articleId="a1" />);
    await screen.findByTestId('comments-list');

    await user.click(screen.getByTestId('delete-comment-btn'));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(await screen.findByTestId('error-toast')).toHaveTextContent(
      'Only the comment owner can delete this comment'
    );
    expect(screen.getByTestId('comments-list')).toBeInTheDocument();
  });

  it('edits a comment and updates its body on success', async () => {
    mockFetchComments.mockResolvedValueOnce([
      makeComment({ id: 'mine', createdBy: 'test-user-1', body: 'Old body' }),
    ]);
    const updated: Comment = {
      id: 'mine',
      articleId: 'a1',
      createdBy: 'test-user-1',
      body: 'New body',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    };
    mockUpdateComment.mockResolvedValueOnce(updated);
    const user = userEvent.setup();

    render(<CommentsSection articleId="a1" />);
    await screen.findByTestId('comments-list');

    await user.click(screen.getByTestId('edit-comment-btn'));
    const textarea = screen.getByTestId('edit-comment-input');
    await user.clear(textarea);
    await user.type(textarea, 'New body');
    await user.click(screen.getByTestId('save-edit-comment-btn'));

    await waitFor(() =>
      expect(mockUpdateComment).toHaveBeenCalledWith('a1', 'mine', 'New body')
    );
    expect(await screen.findByText('New body')).toBeInTheDocument();
  });
});
