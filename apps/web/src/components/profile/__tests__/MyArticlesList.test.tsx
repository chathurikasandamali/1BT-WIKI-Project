import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ArticleListItem, ArticleStatus } from '@/lib/api/articles';
import { formatDate } from '@/lib/utils/date';

const mockFetchMyArticles = jest.fn();
const mockDeleteArticle = jest.fn();
const mockGetReviewFeedback = jest.fn();
const mockUseUser = jest.fn();

jest.mock('@/lib/api/articles', () => ({
  fetchMyArticles: (...args: unknown[]) => mockFetchMyArticles(...args),
  deleteArticle: (...args: unknown[]) => mockDeleteArticle(...args),
  getReviewFeedback: (...args: unknown[]) => mockGetReviewFeedback(...args),
}));

jest.mock('@/lib/hooks/useUser', () => ({
  useUser: () => mockUseUser(),
}));

jest.mock('@/components/articles/ReviewFeedbackModal', () => ({
  ReviewFeedbackModal: ({
    isOpen,
    articleId,
    onClose,
  }: {
    isOpen: boolean;
    articleId: string | null;
    onClose: () => void;
  }): React.JSX.Element | null => {
    if (!isOpen) {
      return null;
    }

    return (
      <div data-testid="review-feedback-modal">
        <span data-testid="review-feedback-article-id">{articleId}</span>
        <button
          type="button"
          data-testid="close-review-feedback"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    );
  },
}));

jest.mock('@/components/shared/ConfirmationModal', () => ({
  ConfirmationModal: ({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
  }: {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
  }): React.JSX.Element | null => {
    if (!isOpen) {
      return null;
    }

    return (
      <div data-testid="delete-confirmation-modal">
        <h2>{title}</h2>
        <p>{message}</p>
        <button type="button" data-testid="confirm-delete" onClick={onConfirm}>
          Delete
        </button>
        <button type="button" data-testid="cancel-delete" onClick={onCancel}>
          Cancel
        </button>
      </div>
    );
  },
}));

import { MyArticlesList } from '@/components/profile/MyArticlesList';

const NORMAL_USER = {
  id: 'u1',
  name: 'Test User',
  role: 'User',
};

const ADMIN_USER = {
  id: 'admin-1',
  name: 'Admin User',
  role: 'Admin',
};

/**
 * Builds a My Articles list fixture.
 */
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
    views: 0,
    rejectionFeedback: null,
    inlineCommentCount: 0,
    ...overrides,
  };
}

/**
 * Returns data-testid values for rendered article cards.
 */
function articleCardTestIds(cards: HTMLElement[]): Array<string | null> {
  return cards.map((card: HTMLElement): string | null =>
    card.getAttribute('data-testid')
  );
}

/**
 * Resolves fetchMyArticles with the given articles.
 */
function mockArticles(articles: ArticleListItem[]): void {
  mockFetchMyArticles.mockResolvedValueOnce({
    articles,
    total: articles.length,
    page: 1,
    limit: 20,
  });
}

describe('MyArticlesList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUser.mockReturnValue({
      user: NORMAL_USER,
      loading: false,
      error: null,
    });
    mockDeleteArticle.mockResolvedValue(undefined);
    mockGetReviewFeedback.mockResolvedValue({
      overallFeedback: null,
      comments: [],
    });
  });

  it('shows a loading state while fetching', () => {
    mockFetchMyArticles.mockReturnValue(new Promise(() => {}));

    render(<MyArticlesList />);

    expect(screen.getByTestId('my-articles-loading')).toBeInTheDocument();
    expect(screen.getByText('Loading your articles')).toBeInTheDocument();
  });

  it('shows an empty state when there are no articles', async () => {
    mockArticles([]);

    render(<MyArticlesList />);

    expect(await screen.findByTestId('my-articles-empty')).toHaveTextContent(
      "You haven't written any articles yet."
    );
    expect(
      screen.getByText('Use Create New Article when you are ready to start a draft.')
    ).toBeInTheDocument();
  });

  it('shows an error state when fetching fails', async () => {
    mockFetchMyArticles.mockRejectedValueOnce(new Error('Network down'));

    render(<MyArticlesList />);

    expect(await screen.findByTestId('my-articles-error')).toHaveTextContent(
      'Network down'
    );
  });

  it('renders summary widgets and splits submitted work from drafts', async () => {
    mockArticles([
      makeArticle({
        id: 'pub1',
        title: 'Published Piece',
        status: 'Published',
        updatedAt: '2026-01-05T00:00:00.000Z',
      }),
      makeArticle({
        id: 'draft1',
        title: 'Draft Piece',
        status: 'Draft',
        updatedAt: '2026-01-04T00:00:00.000Z',
      }),
    ]);

    render(<MyArticlesList />);

    const publishedCard = await screen.findByTestId('article-card-pub1');
    expect(within(publishedCard).getByText('Published Piece')).toBeInTheDocument();
    expect(within(publishedCard).getByTestId('article-status-badge')).toHaveTextContent(
      'Published'
    );
    expect(
      within(publishedCard).getByText(
        `Published: ${formatDate('2026-01-05T00:00:00.000Z')}`
      )
    ).toBeInTheDocument();

    const draftCard = screen.getByTestId('article-card-draft1');
    expect(within(draftCard).getByTestId('article-status-badge')).toHaveTextContent(
      'Draft'
    );
    expect(
      within(draftCard).getByText(
        `Last updated: ${formatDate('2026-01-04T00:00:00.000Z')}`
      )
    ).toBeInTheDocument();

    expect(screen.getByTestId('widget-my-articles-total')).toHaveTextContent('2');
    expect(screen.getByTestId('widget-my-articles-submitted')).toHaveTextContent('1');
    expect(screen.getByTestId('widget-my-articles-drafts')).toHaveTextContent('1');
    expect(screen.getByTestId('my-articles-articles-section')).toBeInTheDocument();
    expect(screen.getByTestId('my-articles-drafts-section')).toBeInTheDocument();
  });

  it('filters articles by title via search', async () => {
    mockArticles([
      makeArticle({ id: 'a1', title: 'React Basics' }),
      makeArticle({ id: 'a2', title: 'Node Deep Dive' }),
    ]);

    render(<MyArticlesList />);
    await screen.findByTestId('article-card-a1');

    const user = userEvent.setup();
    await user.type(screen.getByTestId('article-search-input'), 'react');

    expect(screen.getByTestId('article-card-a1')).toBeInTheDocument();
    expect(screen.queryByTestId('article-card-a2')).not.toBeInTheDocument();
  });

  it('shows a no-match message when search filters out all articles', async () => {
    mockArticles([makeArticle({ id: 'a1', title: 'React Basics' })]);

    render(<MyArticlesList />);
    await screen.findByTestId('article-card-a1');

    const user = userEvent.setup();
    await user.type(screen.getByTestId('article-search-input'), 'nonexistent');

    expect(screen.getByTestId('my-articles-empty')).toHaveTextContent(
      'No articles match your search.'
    );
  });

  it('sorts articles by title A-Z', async () => {
    mockArticles([
      makeArticle({ id: 'a1', title: 'Zebra' }),
      makeArticle({ id: 'a2', title: 'Alpha' }),
    ]);

    render(<MyArticlesList />);
    await screen.findByTestId('article-card-a1');

    const user = userEvent.setup();
    await user.selectOptions(screen.getByTestId('article-sort-select'), 'title');

    const cards = screen.getAllByTestId(/^article-card-/);
    expect(articleCardTestIds(cards)).toEqual([
      'article-card-a2',
      'article-card-a1',
    ]);
  });

  it('sorts articles by newest and oldest updatedAt', async () => {
    mockArticles([
      makeArticle({
        id: 'old',
        title: 'Old',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }),
      makeArticle({
        id: 'new',
        title: 'New',
        updatedAt: '2026-01-10T00:00:00.000Z',
      }),
    ]);

    render(<MyArticlesList />);
    await screen.findByTestId('article-card-old');

    let cards = screen.getAllByTestId(/^article-card-/);
    expect(articleCardTestIds(cards)).toEqual([
      'article-card-new',
      'article-card-old',
    ]);

    const user = userEvent.setup();
    await user.selectOptions(screen.getByTestId('article-sort-select'), 'oldest');

    cards = screen.getAllByTestId(/^article-card-/);
    expect(articleCardTestIds(cards)).toEqual([
      'article-card-old',
      'article-card-new',
    ]);
  });

  it('renders filter chips including Rejected for Unpublished', async () => {
    mockArticles([makeArticle({ id: 'a1', status: 'Draft' })]);

    render(<MyArticlesList />);
    await screen.findByTestId('article-card-a1');

    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rejected' })).toBeInTheDocument();
  });

  it('filters to submitted articles when the Articles widget is clicked', async () => {
    mockArticles([
      makeArticle({ id: 'draft1', title: 'Draft Piece', status: 'Draft' }),
      makeArticle({ id: 'pend1', title: 'Pending Piece', status: 'Pending' }),
    ]);

    render(<MyArticlesList />);
    await screen.findByTestId('article-card-draft1');

    const user = userEvent.setup();
    await user.click(screen.getByTestId('widget-my-articles-submitted'));

    expect(screen.getByTestId('article-card-pend1')).toBeInTheDocument();
    expect(screen.queryByTestId('article-card-draft1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('my-articles-drafts-section')).not.toBeInTheDocument();
  });

  it('filters to drafts when the Drafts widget is clicked', async () => {
    mockArticles([
      makeArticle({ id: 'draft1', title: 'Draft Piece', status: 'Draft' }),
      makeArticle({ id: 'pend1', title: 'Pending Piece', status: 'Pending' }),
    ]);

    render(<MyArticlesList />);
    await screen.findByTestId('article-card-draft1');

    const user = userEvent.setup();
    await user.click(screen.getByTestId('widget-my-articles-drafts'));

    expect(screen.getByTestId('article-card-draft1')).toBeInTheDocument();
    expect(screen.queryByTestId('article-card-pend1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('my-articles-articles-section')).not.toBeInTheDocument();
  });

  it('filters Unpublished articles when Rejected is selected', async () => {
    mockArticles([
      makeArticle({ id: 'rej1', title: 'Rejected Piece', status: 'Unpublished' }),
      makeArticle({ id: 'pub1', title: 'Published Piece', status: 'Published' }),
      makeArticle({ id: 'draft1', title: 'Draft Piece', status: 'Draft' }),
    ]);

    render(<MyArticlesList />);
    await screen.findByTestId('article-card-rej1');

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Rejected' }));

    expect(screen.getByTestId('article-card-rej1')).toBeInTheDocument();
    expect(screen.queryByTestId('article-card-pub1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('article-card-draft1')).not.toBeInTheDocument();
  });

  it('disables edit and delete for Pending articles', async () => {
    mockArticles([makeArticle({ id: 'a1', status: 'Pending' })]);

    render(<MyArticlesList />);
    await screen.findByTestId('article-card-a1');

    expect(screen.getByTestId('edit-article-a1')).toBeDisabled();
    expect(screen.getByTestId('delete-article-a1')).toBeDisabled();
  });

  it('lets authors edit and delete drafts', async () => {
    mockArticles([makeArticle({ id: 'a2', status: 'Draft' })]);

    render(<MyArticlesList />);
    await screen.findByTestId('article-card-a2');

    const editLink = screen.getByTestId('edit-article-a2');
    expect(editLink.tagName).toBe('A');
    expect(editLink).toHaveAttribute('href', '/editor/a2');
    expect(screen.getByTestId('delete-article-a2')).not.toBeDisabled();
  });

  it('lets authors edit Unpublished articles but not delete them', async () => {
    mockArticles([makeArticle({ id: 'a1', status: 'Unpublished' })]);

    render(<MyArticlesList />);
    await screen.findByTestId('article-card-a1');

    const editLink = screen.getByTestId('edit-article-a1');
    expect(editLink.tagName).toBe('A');
    expect(editLink).toHaveAttribute('href', '/editor/a1');
    expect(within(screen.getByTestId('article-card-a1')).getByTestId('article-status-badge')).toHaveTextContent(
      'Rejected'
    );
    expect(screen.getByTestId('delete-article-a1')).toBeDisabled();
  });

  it('lets an admin delete a non-draft article', async () => {
    mockUseUser.mockReturnValue({
      user: ADMIN_USER,
      loading: false,
      error: null,
    });
    mockArticles([makeArticle({ id: 'pub1', status: 'Published' })]);

    render(<MyArticlesList />);
    await screen.findByTestId('article-card-pub1');

    const user = userEvent.setup();
    await user.click(screen.getByTestId('delete-article-pub1'));

    expect(await screen.findByTestId('delete-confirmation-modal')).toHaveTextContent(
      'Permanently Delete Article'
    );

    await user.click(screen.getByTestId('confirm-delete'));

    await waitFor(() => {
      expect(mockDeleteArticle).toHaveBeenCalledWith('pub1', true);
    });
    expect(screen.queryByTestId('article-card-pub1')).not.toBeInTheDocument();
  });

  it('deletes a draft after confirmation', async () => {
    mockArticles([makeArticle({ id: 'draft1', status: 'Draft' })]);

    render(<MyArticlesList />);
    await screen.findByTestId('article-card-draft1');

    const user = userEvent.setup();
    await user.click(screen.getByTestId('delete-article-draft1'));

    expect(await screen.findByTestId('delete-confirmation-modal')).toHaveTextContent(
      'Delete Draft'
    );

    await user.click(screen.getByTestId('confirm-delete'));

    await waitFor(() => {
      expect(mockDeleteArticle).toHaveBeenCalledWith('draft1', false);
    });
    expect(screen.queryByTestId('article-card-draft1')).not.toBeInTheDocument();
  });

  it('shows the first five submitted articles and loads five more on Show more', async () => {
    const articles: ArticleListItem[] = Array.from(
      { length: 7 },
      (_unused: unknown, index: number): ArticleListItem =>
        makeArticle({
          id: `pub${index + 1}`,
          title: `Published ${index + 1}`,
          status: 'Published' as ArticleStatus,
          updatedAt: `2026-01-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
        })
    );
    mockArticles(articles);

    render(<MyArticlesList />);
    await screen.findByTestId('article-card-pub7');

    expect(screen.getByTestId('article-card-pub7')).toBeInTheDocument();
    expect(screen.getByTestId('article-card-pub3')).toBeInTheDocument();
    expect(screen.queryByTestId('article-card-pub2')).not.toBeInTheDocument();
    expect(screen.getByTestId('show-more-articles')).toHaveTextContent('Show more');

    const user = userEvent.setup();
    await user.click(screen.getByTestId('show-more-articles'));

    expect(screen.getByTestId('article-card-pub2')).toBeInTheDocument();
    expect(screen.getByTestId('article-card-pub1')).toBeInTheDocument();
    expect(screen.queryByTestId('show-more-articles')).not.toBeInTheDocument();
  });

  it('does not update state after unmount (cancelled fetch)', async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    mockFetchMyArticles.mockReturnValue(
      new Promise((resolve: (value: unknown) => void) => {
        resolveFetch = resolve;
      })
    );

    const { unmount } = render(<MyArticlesList />);
    unmount();

    resolveFetch({ articles: [], total: 0, page: 1, limit: 20 });

    await waitFor(() => expect(mockFetchMyArticles).toHaveBeenCalledTimes(1));
  });

  describe('Rejection feedback', () => {
    it('shows the reviewer feedback banner for Unpublished articles', async () => {
      mockArticles([
        makeArticle({
          id: 'a1',
          status: 'Unpublished',
          rejectionFeedback: 'Needs more technical depth',
          inlineCommentCount: 3,
        }),
      ]);

      render(<MyArticlesList />);
      await screen.findByTestId('article-card-a1');

      expect(screen.getByTestId('reviewer-feedback-banner')).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: 'Reviewer Feedback' })
      ).toBeInTheDocument();
      expect(screen.getByText('Needs more technical depth')).toBeInTheDocument();
      expect(screen.getByTestId('inline-comment-count')).toHaveTextContent(
        '3 inline comments'
      );
      expect(screen.getByTestId('view-feedback-button')).toBeInTheDocument();
    });

    it('uses a singular comment label when there is one inline comment', async () => {
      mockArticles([
        makeArticle({
          id: 'a1',
          status: 'Unpublished',
          inlineCommentCount: 1,
        }),
      ]);

      render(<MyArticlesList />);
      await screen.findByTestId('article-card-a1');

      expect(screen.getByTestId('inline-comment-count')).toHaveTextContent(
        '1 inline comment'
      );
    });

    it('shows fallback copy when Unpublished article has no feedback', async () => {
      mockArticles([
        makeArticle({
          id: 'a1',
          status: 'Unpublished',
          rejectionFeedback: null,
        }),
      ]);

      render(<MyArticlesList />);
      await screen.findByTestId('article-card-a1');

      expect(
        screen.getByRole('heading', { name: /Reviewer Feedback/i })
      ).toBeInTheDocument();
      expect(
        screen.getByText('No reviewer feedback was provided.')
      ).toBeInTheDocument();
      expect(screen.getByTestId('inline-comment-count')).toHaveTextContent(
        '0 inline comments'
      );
    });

    it('shows fallback copy when Unpublished article has whitespace-only feedback', async () => {
      mockArticles([
        makeArticle({
          id: 'a1',
          status: 'Unpublished',
          rejectionFeedback: '   \n  ',
        }),
      ]);

      render(<MyArticlesList />);
      await screen.findByTestId('article-card-a1');

      expect(
        screen.getByText('No reviewer feedback was provided.')
      ).toBeInTheDocument();
    });

    it('opens and closes ReviewFeedbackModal from View feedback', async () => {
      mockArticles([
        makeArticle({
          id: 'a1',
          status: 'Unpublished',
          rejectionFeedback: 'Fix errors',
          inlineCommentCount: 2,
        }),
      ]);

      const user = userEvent.setup();
      render(<MyArticlesList />);
      await screen.findByTestId('article-card-a1');

      await user.click(screen.getByTestId('view-feedback-button'));

      expect(await screen.findByTestId('review-feedback-modal')).toBeInTheDocument();
      expect(screen.getByTestId('review-feedback-article-id')).toHaveTextContent(
        'a1'
      );

      await user.click(screen.getByTestId('close-review-feedback'));

      await waitFor(() => {
        expect(
          screen.queryByTestId('review-feedback-modal')
        ).not.toBeInTheDocument();
      });
    });

    it('hides feedback for Draft, Pending, and Published articles', async () => {
      mockArticles([
        makeArticle({
          id: 'a1',
          status: 'Draft',
          rejectionFeedback: 'Old feedback 1',
        }),
        makeArticle({
          id: 'a2',
          status: 'Pending',
          rejectionFeedback: 'Old feedback 2',
        }),
        makeArticle({
          id: 'a3',
          status: 'Published',
          rejectionFeedback: 'Old feedback 3',
        }),
      ]);

      render(<MyArticlesList />);
      await screen.findByTestId('article-card-a1');
      await screen.findByTestId('article-card-a2');
      await screen.findByTestId('article-card-a3');

      expect(
        screen.queryByTestId('reviewer-feedback-banner')
      ).not.toBeInTheDocument();
      expect(screen.queryByText(/Old feedback/)).not.toBeInTheDocument();
    });

    it('renders HTML-like feedback as plain text', async () => {
      mockArticles([
        makeArticle({
          id: 'a1',
          status: 'Unpublished',
          rejectionFeedback: '<script>alert(1)</script> <strong>bold</strong>',
        }),
      ]);

      render(<MyArticlesList />);
      await screen.findByTestId('article-card-a1');

      expect(
        screen.getByText('<script>alert(1)</script> <strong>bold</strong>')
      ).toBeInTheDocument();
      expect(screen.queryByRole('strong')).not.toBeInTheDocument();
    });
  });
});
