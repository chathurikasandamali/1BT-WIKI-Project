import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HomepageFeed } from '../HomepageFeed';
import { fetchPublishedArticles } from '@/lib/api/articles';
import { fetchPublishedTechTalks } from '@/lib/api/techTalks';

jest.mock('@/lib/api/articles', () => ({
  fetchPublishedArticles: jest.fn(),
}));

jest.mock('@/lib/api/techTalks', () => ({
  fetchPublishedTechTalks: jest.fn(),
}));

const mockFetchArticles = fetchPublishedArticles as jest.Mock;
const mockFetchTechTalks = fetchPublishedTechTalks as jest.Mock;

describe('HomepageFeed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    class MockIntersectionObserver {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
    Object.defineProperty(window, 'IntersectionObserver', {
      writable: true,
      configurable: true,
      value: MockIntersectionObserver,
    });
  });

  it('renders loading state initially', () => {
    mockFetchArticles.mockReturnValue(new Promise(() => {}));
    mockFetchTechTalks.mockReturnValue(new Promise(() => {}));

    render(<HomepageFeed />);

    expect(screen.getByTestId('page-loader')).toBeInTheDocument();
  });

  it('renders error state if fetching fails', async () => {
    mockFetchArticles.mockRejectedValue(new Error('Failed to load feed data'));
    mockFetchTechTalks.mockResolvedValue({ techTalks: [] });

    render(<HomepageFeed />);

    expect(screen.getByTestId('page-loader')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Failed to load feed data')).toBeInTheDocument();
    });
  });

  it('renders empty state if no content is returned', async () => {
    mockFetchArticles.mockResolvedValue({ articles: [] });
    mockFetchTechTalks.mockResolvedValue({ techTalks: [] });

    render(<HomepageFeed />);

    await waitFor(() => {
      expect(screen.getByText('No published content yet.')).toBeInTheDocument();
    });
  });

  it('renders a mixed feed with correct chronological ordering', async () => {
    const article1 = {
      id: 'a1',
      title: 'Old Article',
      tags: ['react'],
      likeCount: 5,
      commentCount: 2,
      views: 100,
      createdAt: '2026-08-10T10:00:00Z',
      coverImageUrl: null,
      authorName: 'Ada',
    };

    const article2 = {
      id: 'a2',
      title: 'New Article',
      tags: ['typescript'],
      likeCount: 15,
      commentCount: 4,
      views: 200,
      createdAt: '2026-08-12T10:00:00Z',
      coverImageUrl: 'https://cdn.example.com/cover.jpg',
      authorName: 'Grace',
    };

    const techTalk1 = {
      id: 't1',
      title: 'Medium TechTalk',
      tags: ['architecture'],
      presenters: ['Alice'],
      eventDate: '2026-08-11T12:00:00Z',
      createdAt: '2026-08-11T10:00:00Z',
      youtubeVideoId: null,
      description: null,
    };

    mockFetchArticles.mockResolvedValue({ articles: [article1, article2] });
    mockFetchTechTalks.mockResolvedValue({ techTalks: [techTalk1] });

    render(<HomepageFeed />);

    await waitFor(() => {
      expect(screen.queryByTestId('page-loader')).not.toBeInTheDocument();
    });

    const items = screen.getAllByTestId(/card-/);

    expect(items).toHaveLength(3);

    expect(items[0]).toHaveAttribute('data-testid', 'article-card-a2');
    expect(items[0]).toHaveTextContent('New Article');

    expect(items[1]).toHaveAttribute('data-testid', 'techtalk-card-t1');
    expect(items[1]).toHaveTextContent('Medium TechTalk');

    expect(items[2]).toHaveAttribute('data-testid', 'article-card-a1');
    expect(items[2]).toHaveTextContent('Old Article');
  });

  it('shows a cover image only when the article has one', async () => {
    mockFetchArticles.mockResolvedValue({
      articles: [
        {
          id: 'with-image',
          title: 'Illustrated',
          tags: [],
          likeCount: 0,
          commentCount: 0,
          views: 0,
          createdAt: '2026-08-12T10:00:00Z',
          coverImageUrl: 'https://cdn.example.com/cover.jpg',
          authorName: 'Ada',
        },
        {
          id: 'without-image',
          title: 'Text only',
          tags: [],
          likeCount: 0,
          commentCount: 0,
          views: 0,
          createdAt: '2026-08-11T10:00:00Z',
          coverImageUrl: null,
          authorName: 'Grace',
        },
      ],
    });
    mockFetchTechTalks.mockResolvedValue({ techTalks: [] });

    render(<HomepageFeed />);

    const illustrated = await screen.findByTestId('article-card-with-image');
    const textOnly = screen.getByTestId('article-card-without-image');

    expect(illustrated.querySelector('img')).not.toBeNull();
    expect(textOnly.querySelector('img')).toBeNull();
  });

  it('filters the feed to articles only', async () => {
    mockFetchArticles.mockResolvedValue({
      articles: [
        {
          id: 'a1',
          title: 'Only Article',
          tags: [],
          likeCount: 0,
          commentCount: 0,
          views: 0,
          createdAt: '2026-08-12T10:00:00Z',
          coverImageUrl: null,
          authorName: 'Ada',
        },
      ],
    });
    mockFetchTechTalks.mockResolvedValue({
      techTalks: [
        {
          id: 't1',
          title: 'Only Talk',
          tags: [],
          presenters: ['Alice'],
          eventDate: '2026-08-11T12:00:00Z',
          createdAt: '2026-08-11T10:00:00Z',
          youtubeVideoId: null,
          description: null,
        },
      ],
    });

    render(<HomepageFeed />);
    await screen.findByTestId('article-card-a1');

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Articles' }));

    expect(screen.getByTestId('article-card-a1')).toBeInTheDocument();
    expect(screen.queryByTestId('techtalk-card-t1')).not.toBeInTheDocument();
  });

  it('passes AbortSignal to fetch calls', async () => {
    mockFetchArticles.mockResolvedValue({ articles: [] });
    mockFetchTechTalks.mockResolvedValue({ techTalks: [] });

    render(<HomepageFeed />);

    await waitFor(() => {
      expect(mockFetchArticles).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        signal: expect.any(AbortSignal),
      });
      expect(mockFetchTechTalks).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        signal: expect.any(AbortSignal),
      });
    });
  });

  it('shows the first 10 items and loads the next page from See more', async () => {
    const articles = Array.from({ length: 12 }, (_, index) => ({
      id: `a${index + 1}`,
      title: `Article ${index + 1}`,
      tags: [],
      likeCount: 0,
      commentCount: 0,
      views: 0,
      createdAt: `2026-08-${String(12 - index).padStart(2, '0')}T10:00:00Z`,
      coverImageUrl: null,
      authorName: 'Ada',
    }));

    mockFetchArticles.mockResolvedValue({
      articles,
      total: 12,
      page: 1,
      limit: 10,
    });
    mockFetchTechTalks.mockResolvedValue({
      techTalks: [],
      total: 0,
      page: 1,
      limit: 10,
    });

    render(<HomepageFeed />);
    await screen.findByTestId('article-card-a1');

    expect(screen.getAllByTestId(/article-card-/)).toHaveLength(10);
    expect(screen.queryByTestId('article-card-a11')).not.toBeInTheDocument();
    expect(screen.getByTestId('see-more-button')).toHaveTextContent('See more');

    const user = userEvent.setup();
    await user.click(screen.getByTestId('see-more-button'));

    expect(screen.getByTestId('article-card-a11')).toBeInTheDocument();
    expect(screen.getByTestId('article-card-a12')).toBeInTheDocument();
    expect(screen.queryByTestId('see-more-button')).not.toBeInTheDocument();
  });
});
