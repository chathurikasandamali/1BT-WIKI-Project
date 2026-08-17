import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { HomepageFeed } from '../HomepageFeed';
import { fetchPublishedArticles } from '@/lib/api/articles';
import { fetchPublishedTechTalks } from '@/lib/api/techTalks';

// Mock the API functions
jest.mock('@/lib/api/articles', () => ({
  fetchPublishedArticles: jest.fn(),
}));

jest.mock('@/lib/api/techTalks', () => ({
  fetchPublishedTechTalks: jest.fn(),
}));

// Mock the child cards to simplify testing and focus on the Feed logic
jest.mock('@/components/article-listing/ArticleCard', () => ({
  ArticleCard: (props: { id: string; title: string }) => (
    <div data-testid={`article-card-${props.id}`}>
      Article: {props.title}
    </div>
  ),
}));

jest.mock('@/components/tech-talk-listing/TechTalkCard', () => ({
  TechTalkCard: (props: { id: string; title: string }) => (
    <div data-testid={`techtalk-card-${props.id}`}>
      TechTalk: {props.title}
    </div>
  ),
}));

const mockFetchArticles = fetchPublishedArticles as jest.Mock;
const mockFetchTechTalks = fetchPublishedTechTalks as jest.Mock;

describe('HomepageFeed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    // Return unresolved promises to keep it in loading state
    mockFetchArticles.mockReturnValue(new Promise(() => {}));
    mockFetchTechTalks.mockReturnValue(new Promise(() => {}));

    render(<HomepageFeed />);

    expect(screen.getByText('Loading latest updates...')).toBeInTheDocument();
  });

  it('renders error state if fetching fails', async () => {
    mockFetchArticles.mockRejectedValue(new Error('Failed to load feed data'));
    mockFetchTechTalks.mockResolvedValue({ techTalks: [] });

    render(<HomepageFeed />);

    expect(screen.getByText('Loading latest updates...')).toBeInTheDocument();

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
    // Older article
    const article1 = {
      id: 'a1',
      title: 'Old Article',
      tags: ['react'],
      likeCount: 5,
      commentCount: 2,
      views: 100,
      createdAt: '2026-08-10T10:00:00Z',
    };
    
    // Newest article
    const article2 = {
      id: 'a2',
      title: 'New Article',
      tags: ['typescript'],
      likeCount: 15,
      commentCount: 4,
      views: 200,
      createdAt: '2026-08-12T10:00:00Z',
    };

    // Medium-age tech talk
    const techTalk1 = {
      id: 't1',
      title: 'Medium TechTalk',
      tags: ['architecture'],
      presenters: ['Alice'],
      eventDate: '2026-08-11T12:00:00Z',
      createdAt: '2026-08-11T10:00:00Z',
    };

    mockFetchArticles.mockResolvedValue({ articles: [article1, article2] });
    mockFetchTechTalks.mockResolvedValue({ techTalks: [techTalk1] });

    render(<HomepageFeed />);

    await waitFor(() => {
      expect(screen.queryByText('Loading latest updates...')).not.toBeInTheDocument();
    });

    const items = screen.getAllByTestId(/card-/);
    
    // Expect order to be: New Article, Medium TechTalk, Old Article
    expect(items).toHaveLength(3);
    
    expect(items[0]).toHaveAttribute('data-testid', 'article-card-a2');
    expect(items[0]).toHaveTextContent('Article: New Article');
    
    expect(items[1]).toHaveAttribute('data-testid', 'techtalk-card-t1');
    expect(items[1]).toHaveTextContent('TechTalk: Medium TechTalk');

    expect(items[2]).toHaveAttribute('data-testid', 'article-card-a1');
    expect(items[2]).toHaveTextContent('Article: Old Article');
  });

  it('passes AbortSignal to fetch calls', async () => {
    mockFetchArticles.mockResolvedValue({ articles: [] });
    mockFetchTechTalks.mockResolvedValue({ techTalks: [] });

    render(<HomepageFeed />);

    await waitFor(() => {
      expect(mockFetchArticles).toHaveBeenCalledWith({ signal: expect.any(AbortSignal) });
      expect(mockFetchTechTalks).toHaveBeenCalledWith({ signal: expect.any(AbortSignal) });
    });
  });
});
