import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import TechTalksPage from '../page';
import { usePublishedTechTalks } from '@/lib/hooks/useTechTalks';

jest.mock('@/lib/hooks/useTechTalks', () => ({
  usePublishedTechTalks: jest.fn(),
}));

const mockUsePublishedTechTalks = usePublishedTechTalks as jest.Mock;

const mockTalks = [
  {
    id: 'talk-1',
    title: 'Antigravity AI',
    description: 'A talk on advanced agents.',
    presenters: ['Antigravity'],
    tags: ['AI'],
    eventDate: '2026-08-11T10:00:00.000Z',
    slidesUrl: null,
    youtubeVideoId: null,
    status: 'published',
    createdAt: '2026-08-11T09:00:00.000Z',
    updatedAt: '2026-08-11T10:00:00.000Z',
  },
  {
    id: 'talk-2',
    title: 'React 19 Deep Dive',
    description: 'A talk on React 19 features.',
    presenters: ['React Team'],
    tags: ['Frontend', 'React'],
    eventDate: '2026-08-10T10:00:00.000Z',
    slidesUrl: null,
    youtubeVideoId: null,
    status: 'published',
    createdAt: '2026-08-10T09:00:00.000Z',
    updatedAt: '2026-08-10T10:00:00.000Z',
  }
];

describe('TechTalksPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state correctly', () => {
    mockUsePublishedTechTalks.mockReturnValue({
      techTalks: [],
      total: 0,
      loading: true,
      error: null,
      refetch: jest.fn(),
    });

    render(<TechTalksPage />);

    expect(screen.getByTestId('techtalks-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('techtalks-empty')).not.toBeInTheDocument();
    expect(screen.queryByTestId('techtalks-error')).not.toBeInTheDocument();
  });

  it('renders empty state correctly', () => {
    mockUsePublishedTechTalks.mockReturnValue({
      techTalks: [],
      total: 0,
      loading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<TechTalksPage />);

    expect(screen.getByTestId('techtalks-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('techtalks-loading')).not.toBeInTheDocument();
    expect(screen.queryByTestId('techtalks-error')).not.toBeInTheDocument();
  });

  it('renders error state correctly', () => {
    mockUsePublishedTechTalks.mockReturnValue({
      techTalks: [],
      total: 0,
      loading: false,
      error: 'Failed to load Tech Talks',
      refetch: jest.fn(),
    });

    render(<TechTalksPage />);

    expect(screen.getByTestId('techtalks-error')).toBeInTheDocument();
    expect(screen.getByText('Failed to load Tech Talks')).toBeInTheDocument();
    expect(screen.queryByTestId('techtalks-loading')).not.toBeInTheDocument();
    expect(screen.queryByTestId('techtalks-empty')).not.toBeInTheDocument();
  });

  it('renders list of tech talks correctly with default sort params', () => {
    mockUsePublishedTechTalks.mockReturnValue({
      techTalks: mockTalks,
      total: 2,
      loading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<TechTalksPage />);

    // Default call checking: page=1, limit=20, search=undefined, sort='eventDate', order='desc'
    expect(mockUsePublishedTechTalks).toHaveBeenCalledWith(1, 20, undefined, 'eventDate', 'desc');

    expect(screen.getByTestId('techtalk-card-talk-1')).toBeInTheDocument();
    expect(screen.getByTestId('techtalk-card-talk-2')).toBeInTheDocument();
    expect(screen.getByText('Antigravity AI')).toBeInTheDocument();
    expect(screen.getByText('React 19 Deep Dive')).toBeInTheDocument();
  });

  it('triggers search with debounce when search query changes', async () => {
    jest.useFakeTimers();
    mockUsePublishedTechTalks.mockReturnValue({
      techTalks: mockTalks,
      total: 2,
      loading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<TechTalksPage />);

    const searchInput = screen.getByTestId('techtalk-search-input');
    fireEvent.change(searchInput, { target: { value: 'React' } });

    // Before debounce timer expires, should not call hook with search query yet
    expect(mockUsePublishedTechTalks).not.toHaveBeenLastCalledWith(1, 20, 'React', 'eventDate', 'desc');

    // Run timers
    act(() => {
      jest.advanceTimersByTime(400);
    });

    // After debounce timer expires, hook should have been called with debounced search query
    expect(mockUsePublishedTechTalks).toHaveBeenLastCalledWith(1, 20, 'React', 'eventDate', 'desc');
    jest.useRealTimers();
  });

  it('triggers sort change immediately when sorting dropdown changes', () => {
    mockUsePublishedTechTalks.mockReturnValue({
      techTalks: mockTalks,
      total: 2,
      loading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<TechTalksPage />);

    const sortSelect = screen.getByTestId('techtalk-sort-select');
    // SORT_OPTIONS index 2 is 'Title (A–Z)' -> field: 'title', order: 'asc'
    fireEvent.change(sortSelect, { target: { value: '2' } });

    expect(mockUsePublishedTechTalks).toHaveBeenLastCalledWith(1, 20, undefined, 'title', 'asc');
  });
});
