import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AdminArticleListItem } from '@/lib/api/articles';

const mockUseUser = jest.fn();
jest.mock('@/lib/hooks/useUser', () => ({
  useUser: () => mockUseUser(),
}));

const mockFetchAllArticles = jest.fn();
const mockPublishArticleAsAdmin = jest.fn();

jest.mock('@/lib/api/articles', () => ({
  fetchAllArticles: (...args: unknown[]) => mockFetchAllArticles(...args),
  publishArticleAsAdmin: (...args: unknown[]) =>
    mockPublishArticleAsAdmin(...args),
}));

import AdminApprovalsPage from '../page';

const FIXED_APPROVED_DATE = '2026-01-10T00:00:00.000Z';

const ADMIN_USER = {
  id: 'adm1',
  name: 'Admin User',
  role: 'Admin',
  email: 'admin@1billiontech.com',
};

function makeApprovedArticle(
  overrides: Partial<AdminArticleListItem> = {}
): AdminArticleListItem {
  return {
    id: 'a1',
    title: 'Approved Article Title',
    authorId: 'u1',
    authorName: 'Jane Doe',
    authorEmail: 'jane@1billiontech.com',
    tags: ['engineering'],
    status: 'Approved',
    createdAt: FIXED_APPROVED_DATE,
    updatedAt: FIXED_APPROVED_DATE,
    likeCount: 0,
    commentCount: 0,
    views: 0,
    rejectionFeedback: null,
    inlineCommentCount: 0,
    ...overrides,
  };
}

function mockApprovedList(articles: AdminArticleListItem[]): void {
  mockFetchAllArticles.mockResolvedValueOnce({
    articles,
    total: articles.length,
    page: 1,
    limit: 20,
  });
}

describe('AdminApprovalsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUser.mockReturnValue({ user: ADMIN_USER, loading: false });
  });

  it('renders permission denied message for a Reviewer', () => {
    mockUseUser.mockReturnValue({
      user: { id: 'rev1', name: 'Reviewer', role: 'Reviewer', email: 'r@x.com' },
      loading: false,
    });

    render(<AdminApprovalsPage />);

    expect(
      screen.getByText(/you don't have permission to view this page/i)
    ).toBeInTheDocument();
    expect(mockFetchAllArticles).not.toHaveBeenCalled();
  });

  it('requests only reviewer-approved articles', async () => {
    mockApprovedList([]);

    render(<AdminApprovalsPage />);

    await waitFor(() => {
      expect(mockFetchAllArticles).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'Approved' })
      );
    });
  });

  it('shows loading state while fetching', () => {
    mockFetchAllArticles.mockReturnValue(new Promise(() => {}));

    render(<AdminApprovalsPage />);

    expect(screen.getByTestId('admin-approvals-loading')).toBeInTheDocument();
  });

  it('shows an empty placeholder when nothing awaits publication', async () => {
    mockApprovedList([]);

    render(<AdminApprovalsPage />);

    expect(await screen.findByTestId('admin-approvals-empty')).toHaveTextContent(
      'No articles awaiting publication.'
    );
  });

  it('shows an error state when fetching fails', async () => {
    mockFetchAllArticles.mockRejectedValueOnce(new Error('Failed to load'));

    render(<AdminApprovalsPage />);

    expect(await screen.findByTestId('admin-approvals-error')).toHaveTextContent(
      'Failed to load'
    );
  });

  it('renders approved article rows with author and a link to the article', async () => {
    mockApprovedList([makeApprovedArticle({ id: 'a1', title: 'Ready To Ship' })]);

    render(<AdminApprovalsPage />);

    const card = await screen.findByTestId('approved-article-card-a1');
    expect(within(card).getByText('Ready To Ship')).toBeInTheDocument();
    expect(within(card).getByText('Jane Doe')).toBeInTheDocument();
    expect(within(card).getByTestId('article-status-badge')).toHaveTextContent(
      'Approved'
    );
    expect(screen.getByTestId('view-approved-article-a1')).toHaveAttribute(
      'href',
      '/admin/articles/a1?from=approvals'
    );
  });

  it('publishes an article after confirmation and removes it from the queue', async () => {
    mockApprovedList([
      makeApprovedArticle({ id: 'a1', title: 'Ready To Ship' }),
      makeApprovedArticle({ id: 'a2', title: 'Also Ready' }),
    ]);
    mockPublishArticleAsAdmin.mockResolvedValueOnce({});

    render(<AdminApprovalsPage />);

    const user = userEvent.setup();
    await user.click(await screen.findByTestId('publish-article-a1'));

    expect(
      screen.getByRole('heading', { name: 'Publish Article' })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Are you sure you want to publish "Ready To Ship"? It will become publicly visible immediately.'
      )
    ).toBeInTheDocument();

    // The modal is portaled after the list, so the confirm button is the last
    // "Publish" control in the document.
    await user.click(screen.getAllByRole('button', { name: 'Publish' }).pop()!);

    await waitFor(() => {
      expect(mockPublishArticleAsAdmin).toHaveBeenCalledWith('a1');
    });

    expect(
      await screen.findByText('Article published successfully')
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.queryByTestId('approved-article-card-a1')
      ).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('approved-article-card-a2')).toBeInTheDocument();
  });

  it('keeps the article in the queue and surfaces an error when publishing fails', async () => {
    mockApprovedList([makeApprovedArticle({ id: 'a1' })]);
    mockPublishArticleAsAdmin.mockRejectedValueOnce(new Error('Publish failed'));

    render(<AdminApprovalsPage />);

    const user = userEvent.setup();
    await user.click(await screen.findByTestId('publish-article-a1'));
    await user.click(screen.getAllByRole('button', { name: 'Publish' }).pop()!);

    expect(await screen.findByText('Publish failed')).toBeInTheDocument();
    expect(screen.getByTestId('approved-article-card-a1')).toBeInTheDocument();
  });
});
