import { render, screen, waitFor, act } from '@testing-library/react';
import ArticleDetailPage from '../page';
import { getArticle } from '@/lib/api/articles';
import React from 'react';

// Mock dependencies
jest.mock('@/lib/api/articles', () => ({
  getArticle: jest.fn(),
}));

jest.mock('@/components/article-detail/LikeButton', () => ({
  LikeButton: ({ articleId, initialLikeCount, initialLikedByMe }: { articleId: string; initialLikeCount: number; initialLikedByMe: boolean }) => (
    <div data-testid="like-button">
      Like Button - ID: {articleId} - Count: {initialLikeCount} - Liked: {initialLikedByMe?.toString()}
    </div>
  ),
}));

jest.mock('@/components/article-detail/ArticleContent', () => ({
  ArticleContent: () => <div data-testid="article-content">Content</div>,
}));

jest.mock('@/components/article-detail/CommentsSection', () => ({
  CommentsSection: () => <div data-testid="comments-section">Comments</div>,
}));

const mockGetArticle = getArticle as jest.Mock;

describe('ArticleDetailPage', () => {
  const mockValidId = '123e4567-e89b-12d3-a456-426614174000';
  const mockArticle = {
    id: mockValidId,
    title: 'Test Article',
    body: { type: 'doc', content: [] },
    authorId: 'author-123',
    tags: ['Test', 'React'],
    status: 'Published',
    createdAt: '2026-07-27T10:00:00Z',
    updatedAt: '2026-07-27T10:00:00Z',
    likeCount: 5,
    commentCount: 2,
    likedByMe: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', async () => {
    mockGetArticle.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    await act(async () => {
      render(
        <React.Suspense fallback={<div>Suspense fallback</div>}>
          <ArticleDetailPage params={Promise.resolve({ id: mockValidId })} />
        </React.Suspense>
      );
    });
    
    // Note: React.use suspends briefly, then the component renders its own loading state
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
  });

  it('renders error state if article is not found', async () => {
    mockGetArticle.mockRejectedValue(new Error('Article not found'));

    await act(async () => {
      render(
        <React.Suspense fallback={<div>Suspense fallback</div>}>
          <ArticleDetailPage params={Promise.resolve({ id: 'invalid-id' })} />
        </React.Suspense>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Article not found')).toBeInTheDocument();
    });
    
    // Ensure mock data is never rendered
    expect(screen.queryByTestId('like-button')).not.toBeInTheDocument();
  });

  it('renders article details and passes correct UUID to LikeButton', async () => {
    mockGetArticle.mockResolvedValue(mockArticle);

    await act(async () => {
      render(
        <React.Suspense fallback={<div>Suspense fallback</div>}>
          <ArticleDetailPage params={Promise.resolve({ id: mockValidId })} />
        </React.Suspense>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Test Article')).toBeInTheDocument();
    });

    // Verify LikeButton receives real UUID and correct initial states
    expect(screen.getByTestId('like-button')).toHaveTextContent(
      `Like Button - ID: ${mockValidId} - Count: 5 - Liked: true`
    );

    // Verify it handles author gracefully (Unknown Author)
    expect(screen.getByText('Unknown Author')).toBeInTheDocument();
  });

  it('renders article details with zero likes correctly (no default fallbacks)', async () => {
    mockGetArticle.mockResolvedValue({
      ...mockArticle,
      likeCount: 0,
      likedByMe: false,
    });

    await act(async () => {
      render(
        <React.Suspense fallback={<div>Suspense fallback</div>}>
          <ArticleDetailPage params={Promise.resolve({ id: mockValidId })} />
        </React.Suspense>
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Test Article')).toBeInTheDocument();
    });

    // Verify LikeButton receives real UUID and correct zero/false initial states
    expect(screen.getByTestId('like-button')).toHaveTextContent(
      `Like Button - ID: ${mockValidId} - Count: 0 - Liked: false`
    );
  });
});
