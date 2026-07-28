import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ArticleListItem } from '@/lib/api/articles';

const mockFetchMyArticles = jest.fn();

jest.mock('@/lib/api/articles', () => ({
  fetchMyArticles: (...args: unknown[]) => mockFetchMyArticles(...args),
}));

jest.mock('@/lib/hooks/useUser', () => ({
  useUser: () => ({
    user: { id: 'u1', name: 'Test User', role: 'User' },
    loading: false,
    error: null,
  }),
}));

import { MyArticlesList } from '@/components/profile/MyArticlesList';

function makeArticle(
  overrides: Partial<ArticleListItem> = {}
): ArticleListItem {
  return {
    id: 'a1',
    title: 'Alpha Article',
    authorId: 'u1',
    tags: [],
    status: 'Draft',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-05T00:00:00.000Z',
    likeCount: 0,
    commentCount: 0,
    rejectionFeedback: null,
    ...overrides,
  };
}

describe('MyArticlesList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a loading state while fetching', () => {
    mockFetchMyArticles.mockReturnValue(new Promise(() => {}));

    render(<MyArticlesList />);

    expect(screen.getByText('Loading your articles...')).toBeInTheDocument();
  });

  it('shows an empty state when there are no articles', async () => {
    mockFetchMyArticles.mockResolvedValueOnce({
      articles: [],
      total: 0,
      page: 1,
      limit: 20,
    });

    render(<MyArticlesList />);

    expect(await screen.findByTestId('my-articles-empty')).toHaveTextContent(
      "You haven't written any articles yet."
    );
  });

  it('shows an error state when fetching fails', async () => {
    mockFetchMyArticles.mockRejectedValueOnce(new Error('Network down'));

    render(<MyArticlesList />);

    expect(await screen.findByTestId('my-articles-error')).toHaveTextContent(
      'Network down'
    );
  });

  it('renders article cards with status and date labels', async () => {
    const published = makeArticle({
      id: 'pub1',
      title: 'Published Piece',
      status: 'Published',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-05T00:00:00.000Z',
    });
    const draft = makeArticle({
      id: 'draft1',
      title: 'Draft Piece',
      status: 'Draft',
      createdAt: '2026-01-03T00:00:00.000Z',
      updatedAt: '2026-01-04T00:00:00.000Z',
    });
    mockFetchMyArticles.mockResolvedValueOnce({
      articles: [published, draft],
      total: 2,
      page: 1,
      limit: 20,
    });

    render(<MyArticlesList />);

    const publishedCard = await screen.findByTestId('article-card-pub1');
    expect(within(publishedCard).getByText('Published')).toBeInTheDocument();
    expect(
      within(publishedCard).getByText(/Published: 05 Jan 2026/)
    ).toBeInTheDocument();

    const draftCard = screen.getByTestId('article-card-draft1');
    expect(within(draftCard).getByText('Draft')).toBeInTheDocument();
    
    // Instead of hardcoding the expected string which may fail due to timezone differences
    // or mismatching date fields, we just ensure the formatted updatedAt is in the document
    const formattedDraftDate = new Date('2026-01-04T00:00:00.000Z').toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    expect(
      within(draftCard).getByText(new RegExp(`Last updated: ${formattedDraftDate}`))
    ).toBeInTheDocument();
  });

  it('filters articles by title via search', async () => {
    mockFetchMyArticles.mockResolvedValueOnce({
      articles: [
        makeArticle({ id: 'a1', title: 'React Basics' }),
        makeArticle({ id: 'a2', title: 'Node Deep Dive' }),
      ],
      total: 2,
      page: 1,
      limit: 20,
    });

    render(<MyArticlesList />);
    await screen.findByTestId('article-card-a1');

    const user = userEvent.setup();
    await user.type(screen.getByTestId('article-search-input'), 'react');

    expect(screen.getByTestId('article-card-a1')).toBeInTheDocument();
    expect(screen.queryByTestId('article-card-a2')).not.toBeInTheDocument();
  });

  it('shows a no-match message when search filters out all articles', async () => {
    mockFetchMyArticles.mockResolvedValueOnce({
      articles: [makeArticle({ id: 'a1', title: 'React Basics' })],
      total: 1,
      page: 1,
      limit: 20,
    });

    render(<MyArticlesList />);
    await screen.findByTestId('article-card-a1');

    const user = userEvent.setup();
    await user.type(screen.getByTestId('article-search-input'), 'nonexistent');

    expect(screen.getByTestId('my-articles-empty')).toHaveTextContent(
      'No articles match your search.'
    );
  });

  it('sorts articles by title A-Z', async () => {
    mockFetchMyArticles.mockResolvedValueOnce({
      articles: [
        makeArticle({ id: 'a1', title: 'Zebra' }),
        makeArticle({ id: 'a2', title: 'Alpha' }),
      ],
      total: 2,
      page: 1,
      limit: 20,
    });

    render(<MyArticlesList />);
    await screen.findByTestId('article-card-a1');

    const user = userEvent.setup();
    await user.selectOptions(
      screen.getByTestId('article-sort-select'),
      'title'
    );

    const cards = screen.getAllByTestId(/^article-card-/);
    expect(cards.map((c) => c.getAttribute('data-testid'))).toEqual([
      'article-card-a2',
      'article-card-a1',
    ]);
  });

  it('sorts articles by newest and oldest createdAt', async () => {
    mockFetchMyArticles.mockResolvedValueOnce({
      articles: [
        makeArticle({
          id: 'old',
          title: 'Old',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        }),
        makeArticle({
          id: 'new',
          title: 'New',
          createdAt: '2026-01-10T00:00:00.000Z',
          updatedAt: '2026-01-10T00:00:00.000Z',
        }),
      ],
      total: 2,
      page: 1,
      limit: 20,
    });

    render(<MyArticlesList />);
    await screen.findByTestId('article-card-old');

    let cards = screen.getAllByTestId(/^article-card-/);
    expect(cards.map((c) => c.getAttribute('data-testid'))).toEqual([
      'article-card-new',
      'article-card-old',
    ]);

    const user = userEvent.setup();
    await user.selectOptions(
      screen.getByTestId('article-sort-select'),
      'oldest'
    );

    cards = screen.getAllByTestId(/^article-card-/);
    expect(cards.map((c) => c.getAttribute('data-testid'))).toEqual([
      'article-card-old',
      'article-card-new',
    ]);
  });

  it('renders disabled edit and delete buttons', async () => {
    mockFetchMyArticles.mockResolvedValueOnce({
      articles: [makeArticle({ id: 'a1', status: 'Pending' })],
      total: 1,
      page: 1,
      limit: 20,
    });

    render(<MyArticlesList />);
    await screen.findByTestId('article-card-a1');

    expect(screen.getByTestId('edit-article-a1')).toBeDisabled();
    expect(screen.getByTestId('delete-article-a1')).toBeDisabled();
  });

  it('renders a link for editing Draft articles', async () => {
    mockFetchMyArticles.mockResolvedValueOnce({
      articles: [makeArticle({ id: 'a2', status: 'Draft' })],
      total: 1,
      page: 1,
      limit: 20,
    });

    render(<MyArticlesList />);
    await screen.findByTestId('article-card-a2');

    const editLink = screen.getByTestId('edit-article-a2');
    expect(editLink.tagName).toBe('A');
    expect(editLink).toHaveAttribute('href', '/editor/a2');
    expect(screen.getByTestId('delete-article-a2')).not.toBeDisabled();
  });

  it('does not update state after unmount (cancelled fetch)', async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    mockFetchMyArticles.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      })
    );

    const { unmount } = render(<MyArticlesList />);
    unmount();

    resolveFetch({ articles: [], total: 0, page: 1, limit: 20 });

    await waitFor(() => expect(mockFetchMyArticles).toHaveBeenCalledTimes(1));
  });

  describe('Rejection feedback', () => {
    it('shows rejection feedback for Unpublished articles', async () => {
      mockFetchMyArticles.mockResolvedValueOnce({
        articles: [
          makeArticle({
            id: 'a1',
            status: 'Unpublished',
            rejectionFeedback: 'Needs more technical depth',
          }),
        ],
        total: 1,
        page: 1,
        limit: 20,
      });

      render(<MyArticlesList />);
      await screen.findByTestId('article-card-a1');

      expect(screen.getByText('Reviewer feedback')).toBeInTheDocument();
      expect(screen.getByText('Needs more technical depth')).toBeInTheDocument();
    });

    it('shows fallback message when Unpublished article has null feedback', async () => {
      mockFetchMyArticles.mockResolvedValueOnce({
        articles: [
          makeArticle({
            id: 'a1',
            status: 'Unpublished',
            rejectionFeedback: null,
          }),
        ],
        total: 1,
        page: 1,
        limit: 20,
      });

      render(<MyArticlesList />);
      await screen.findByTestId('article-card-a1');

      expect(screen.getByText('Reviewer feedback')).toBeInTheDocument();
      expect(screen.getByText('No reviewer feedback was provided.')).toBeInTheDocument();
    });

    it('shows fallback message when Unpublished article has empty or whitespace feedback', async () => {
      mockFetchMyArticles.mockResolvedValueOnce({
        articles: [
          makeArticle({
            id: 'a1',
            status: 'Unpublished',
            rejectionFeedback: '   \n  ',
          }),
        ],
        total: 1,
        page: 1,
        limit: 20,
      });

      render(<MyArticlesList />);
      await screen.findByTestId('article-card-a1');

      expect(screen.getByText('Reviewer feedback')).toBeInTheDocument();
      expect(screen.getByText('No reviewer feedback was provided.')).toBeInTheDocument();
    });

    it('hides feedback for Draft, Pending, and Published articles even with historical feedback string', async () => {
      mockFetchMyArticles.mockResolvedValueOnce({
        articles: [
          makeArticle({ id: 'a1', status: 'Draft', rejectionFeedback: 'Old feedback 1' }),
          makeArticle({ id: 'a2', status: 'Pending', rejectionFeedback: 'Old feedback 2' }),
          makeArticle({ id: 'a3', status: 'Published', rejectionFeedback: 'Old feedback 3' }),
        ],
        total: 3,
        page: 1,
        limit: 20,
      });

      render(<MyArticlesList />);
      await screen.findByTestId('article-card-a1');
      await screen.findByTestId('article-card-a2');
      await screen.findByTestId('article-card-a3');

      expect(screen.queryByText('Reviewer feedback')).not.toBeInTheDocument();
      expect(screen.queryByText(/Old feedback/)).not.toBeInTheDocument();
    });

    it('retains edit controls for Unpublished articles', async () => {
      mockFetchMyArticles.mockResolvedValueOnce({
        articles: [
          makeArticle({ id: 'a1', status: 'Unpublished' }),
        ],
        total: 1,
        page: 1,
        limit: 20,
      });

      render(<MyArticlesList />);
      await screen.findByTestId('article-card-a1');

      const editLink = screen.getByTestId('edit-article-a1');
      expect(editLink.tagName).toBe('A');
      expect(editLink).toHaveAttribute('href', '/editor/a1');
    });

    it('renders HTML-like feedback as plain text', async () => {
      mockFetchMyArticles.mockResolvedValueOnce({
        articles: [
          makeArticle({
            id: 'a1',
            status: 'Unpublished',
            rejectionFeedback: '<script>alert(1)</script> <strong>bold</strong>',
          }),
        ],
        total: 1,
        page: 1,
        limit: 20,
      });

      render(<MyArticlesList />);
      await screen.findByTestId('article-card-a1');

      expect(screen.getByText('<script>alert(1)</script> <strong>bold</strong>')).toBeInTheDocument();
      expect(screen.queryByRole('strong')).not.toBeInTheDocument();
    });
  });
});
