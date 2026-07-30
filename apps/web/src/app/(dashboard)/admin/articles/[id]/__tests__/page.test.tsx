import { render, screen, waitFor, act } from '@testing-library/react';
import React from 'react';

const mockGetArticle = jest.fn();

jest.mock('@/lib/api/articles', () => ({
  getArticle: (...args: unknown[]) => mockGetArticle(...args),
}));

jest.mock('@/components/auth/RoleGuard', () => ({
  RoleGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/components/article-detail/ArticleContent', () => ({
  ArticleContent: () => <div data-testid="article-content">Content</div>,
}));

import AdminArticleDetailPage from '../page';

const mockArticleId = '123e4567-e89b-12d3-a456-426614174000';
const mockArticle = {
  id: mockArticleId,
  title: 'Draft Under Review',
  body: { type: 'doc', content: [] },
  authorId: 'author-123',
  tags: ['Internal'],
  status: 'Draft',
  createdAt: '2026-07-20T10:00:00Z',
  updatedAt: '2026-07-27T10:00:00Z',
  likeCount: 3,
  commentCount: 1,
  likedByMe: false,
  views: 17,
  authorName: 'Alice',
  authorEmail: 'alice@example.com',
};

const renderPage = async (id: string = mockArticleId) => {
  await act(async () => {
    render(
      <React.Suspense fallback={<div>Suspense fallback</div>}>
        <AdminArticleDetailPage params={Promise.resolve({ id })} />
      </React.Suspense>
    );
  });
};

describe('AdminArticleDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the loading skeleton while fetching', async () => {
    mockGetArticle.mockImplementation(() => new Promise(() => {}));

    await renderPage();

    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
  });

  it('renders title, status badge, author identity, and oversight stats', async () => {
    mockGetArticle.mockResolvedValue(mockArticle);

    await renderPage();

    await waitFor(() => {
      expect(screen.getByText('Draft Under Review')).toBeInTheDocument();
    });

    expect(mockGetArticle).toHaveBeenCalledWith(mockArticleId);
    expect(screen.getByTestId('article-status-badge')).toHaveTextContent(
      'Draft'
    );
    expect(screen.getByTestId('author-name')).toHaveTextContent('Alice');
    expect(screen.getByTestId('author-email')).toHaveTextContent(
      'alice@example.com'
    );
    expect(screen.getByTestId('views-stat')).toHaveTextContent('17');
    expect(screen.getByTestId('article-content')).toBeInTheDocument();
  });

  it('falls back to Unknown Author when no author name is returned', async () => {
    mockGetArticle.mockResolvedValue({
      ...mockArticle,
      authorName: undefined,
      authorEmail: undefined,
    });

    await renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('author-name')).toHaveTextContent(
        'Unknown Author'
      );
    });
    expect(screen.queryByTestId('author-email')).not.toBeInTheDocument();
  });

  it('renders the error state with a back link when loading fails', async () => {
    mockGetArticle.mockRejectedValue(new Error('Article not available'));

    await renderPage('other-id');

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent(
        'Article not available'
      );
    });
    expect(
      screen.getByRole('link', { name: /Back to Article Management/i })
    ).toHaveAttribute('href', '/admin/articles');
    expect(screen.queryByTestId('article-content')).not.toBeInTheDocument();
  });
});
