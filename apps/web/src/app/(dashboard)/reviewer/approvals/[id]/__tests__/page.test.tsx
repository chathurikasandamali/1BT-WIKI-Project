import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ArticleDetail } from '@/lib/api/reviewer.api';

const mockPush = jest.fn();
const mockParams = { id: 'article-123' };

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => mockParams,
}));

const mockUseUser = jest.fn();
jest.mock('@/lib/hooks/useUser', () => ({
  useUser: () => mockUseUser(),
}));

const mockGetArticleForReview = jest.fn();
const mockApprove = jest.fn();
const mockReject = jest.fn();

jest.mock('@/lib/api/reviewer.api', () => ({
  getArticleForReview: (...args: unknown[]) => mockGetArticleForReview(...args),
  approve: (...args: unknown[]) => mockApprove(...args),
  reject: (...args: unknown[]) => mockReject(...args),
}));

import ReviewArticleDetailPage from '../page';

function makeArticleDetail(overrides: Partial<ArticleDetail> = {}): ArticleDetail {
  return {
    id: 'article-123',
    title: 'Pending Review Article Title',
    body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Article text content' }] }] },
    authorId: 'user-1',
    authorName: 'John Author',
    authorEmail: 'john@1billiontech.com',
    tags: ['review', 'architecture'],
    status: 'Pending',
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-01-15T10:00:00.000Z',
    ...overrides,
  };
}

describe('ReviewArticleDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUser.mockReturnValue({
      user: { id: 'rev1', name: 'Reviewer User', role: 'Reviewer', email: 'rev@1billiontech.com' },
      loading: false,
    });
  });

  it('renders permission denied message when user is not Reviewer or Admin', () => {
    mockUseUser.mockReturnValue({
      user: { id: 'u1', name: 'Regular User', role: 'User', email: 'user@1billiontech.com' },
      loading: false,
    });

    render(<ReviewArticleDetailPage />);

    expect(screen.getByText(/you don't have permission to view this page/i)).toBeInTheDocument();
  });

  it('shows loading state while fetching article', () => {
    mockGetArticleForReview.mockReturnValue(new Promise(() => {}));

    render(<ReviewArticleDetailPage />);

    expect(screen.getByTestId('review-article-loading')).toHaveTextContent(
      'Loading article for review...'
    );
  });

  it('shows error state when fetching fails or article is no longer Pending', async () => {
    mockGetArticleForReview.mockRejectedValueOnce(
      new Error('Only Pending articles can be reviewed')
    );

    render(<ReviewArticleDetailPage />);

    expect(await screen.findByTestId('review-article-error')).toHaveTextContent(
      'Only Pending articles can be reviewed'
    );
  });

  it('renders article title, author, status badge, and content correctly', async () => {
    const article = makeArticleDetail();
    mockGetArticleForReview.mockResolvedValueOnce(article);

    render(<ReviewArticleDetailPage />);

    expect(await screen.findByRole('heading', { name: 'Pending Review Article Title' })).toBeInTheDocument();
    expect(screen.getByText('John Author')).toBeInTheDocument();
    expect(screen.getByTestId('article-status-badge')).toHaveTextContent('Pending');
    expect(screen.getByTestId('review-article-content')).toBeInTheDocument();
    expect(screen.getByText('#review')).toBeInTheDocument();
  });

  it('handles approve flow: opens modal, calls approve API, and navigates back', async () => {
    const article = makeArticleDetail();
    mockGetArticleForReview.mockResolvedValueOnce(article);
    mockApprove.mockResolvedValueOnce({});

    render(<ReviewArticleDetailPage />);

    await screen.findByRole('heading', { name: 'Pending Review Article Title' });

    const user = userEvent.setup();
    await user.click(screen.getByTestId('approve-button'));

    expect(screen.getByText('Approve & Publish Article')).toBeInTheDocument();

    const confirmBtn = screen.getAllByRole('button', { name: 'Approve & Publish' }).pop()!;
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(mockApprove).toHaveBeenCalledWith('article-123');
      expect(mockPush).toHaveBeenCalledWith('/reviewer/approvals');
    });
  });

  it('handles reject flow: opens modal, accepts feedback, calls reject API, and navigates back', async () => {
    const article = makeArticleDetail();
    mockGetArticleForReview.mockResolvedValueOnce(article);
    mockReject.mockResolvedValueOnce({});

    render(<ReviewArticleDetailPage />);

    await screen.findByRole('heading', { name: 'Pending Review Article Title' });

    const user = userEvent.setup();
    await user.click(screen.getByTestId('reject-button'));

    expect(screen.getByRole('heading', { name: 'Reject Article' })).toBeInTheDocument();

    const input = screen.getByTestId('reject-feedback-input');
    await user.type(input, 'Rejection feedback with enough characters');

    const rejectBtn = screen.getAllByRole('button', { name: 'Reject Article' }).pop()!;
    await user.click(rejectBtn);

    await waitFor(() => {
      expect(mockReject).toHaveBeenCalledWith('article-123', 'Rejection feedback with enough characters');
      expect(mockPush).toHaveBeenCalledWith('/reviewer/approvals');
    });
  });
});
