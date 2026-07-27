import { render, screen, within } from '@testing-library/react';
import type { PendingArticleListItem } from '@/lib/api/reviewer.api';

const mockUseUser = jest.fn();
jest.mock('@/lib/hooks/useUser', () => ({
  useUser: () => mockUseUser(),
}));

const mockListPending = jest.fn();
const mockApprove = jest.fn();
const mockReject = jest.fn();

jest.mock('@/lib/api/reviewer.api', () => ({
  listPending: (...args: unknown[]) => mockListPending(...args),
  approve: (...args: unknown[]) => mockApprove(...args),
  reject: (...args: unknown[]) => mockReject(...args),
}));

import ReviewerApprovalsPage from '../page';
const FIXED_SUBMITTED_DATE = '2026-01-10T00:00:00.000Z';

function makePendingArticle(overrides: Partial<PendingArticleListItem> = {}): PendingArticleListItem {
  return {
    id: 'p1',
    title: 'Pending Article Title',
    authorId: 'u1',
    authorName: 'Jane Doe',
    authorEmail: 'jane@1billiontech.com',
    tags: ['engineering'],
    status: 'Pending',
    createdAt: FIXED_SUBMITTED_DATE,
    updatedAt: FIXED_SUBMITTED_DATE,
    likeCount: 0,
    commentCount: 0,
    ...overrides,
  };
}

describe('ReviewerApprovalsPage', () => {
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

    render(<ReviewerApprovalsPage />);

    expect(screen.getByText(/you don't have permission to view this page/i)).toBeInTheDocument();
  });

  it('shows loading state while fetching pending articles', () => {
    mockListPending.mockReturnValue(new Promise(() => {}));

    render(<ReviewerApprovalsPage />);

    expect(screen.getByText('Loading pending articles...')).toBeInTheDocument();
  });

  it('shows error state when fetching fails', async () => {
    mockListPending.mockRejectedValueOnce(new Error('Failed to fetch pending articles'));

    render(<ReviewerApprovalsPage />);

    expect(await screen.findByTestId('pending-articles-error')).toHaveTextContent(
      'Failed to fetch pending articles'
    );
  });

  it('shows empty state when no pending articles exist', async () => {
    mockListPending.mockResolvedValueOnce({ articles: [], total: 0, page: 1, limit: 20 });

    render(<ReviewerApprovalsPage />);

    expect(await screen.findByTestId('pending-articles-empty')).toHaveTextContent(
      'No articles pending approval.'
    );
  });

  it('renders pending article rows with status badge and author info', async () => {
    mockListPending.mockResolvedValueOnce({
      articles: [makePendingArticle({ id: 'p1', title: 'First Pending' })],
      total: 1,
      page: 1,
      limit: 20,
    });

    render(<ReviewerApprovalsPage />);

    const card = await screen.findByTestId('article-card-p1');
    expect(within(card).getByText('First Pending')).toBeInTheDocument();
    expect(within(card).getByText('Jane Doe')).toBeInTheDocument();
    expect(within(card).getByTestId('article-status-badge')).toHaveTextContent('Pending');
  });

  it('renders View link per article pointing to /reviewer/approvals/{id}', async () => {
    mockListPending.mockResolvedValueOnce({
      articles: [
        makePendingArticle({ id: 'p1', title: 'First Pending' }),
        makePendingArticle({ id: 'p2', title: 'Second Pending' }),
      ],
      total: 2,
      page: 1,
      limit: 20,
    });

    render(<ReviewerApprovalsPage />);

    const link1 = await screen.findByTestId('view-article-p1');
    expect(link1).toBeInTheDocument();
    expect(link1).toHaveAttribute('href', '/reviewer/approvals/p1');

    const link2 = await screen.findByTestId('view-article-p2');
    expect(link2).toBeInTheDocument();
    expect(link2).toHaveAttribute('href', '/reviewer/approvals/p2');
  });
});
