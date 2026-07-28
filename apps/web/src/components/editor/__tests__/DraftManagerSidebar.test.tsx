import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { DraftManagerSidebar } from '../DraftManagerSidebar';
import { fetchMyArticles } from '@/lib/api/articles';

// Mock dependencies
jest.mock('@/lib/api/articles', () => ({
  fetchMyArticles: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'article-a-uuid' }),
  useRouter: () => ({ push: jest.fn() }),
}));

// Mock GSAP and Lucide to avoid animation/icon issues in test
jest.mock('@gsap/react', () => ({
  useGSAP: (fn: () => void) => {
    // Just run the hook synchronously for test coverage
    React.useEffect(() => {
      fn();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
  },
}));
jest.mock('gsap', () => ({
  to: jest.fn(),
}));
jest.mock('lucide-react', () => ({
  ChevronLeft: function ChevronLeft() { return <div data-testid="chevron-left" />; },
  ChevronRight: function ChevronRight() { return <div data-testid="chevron-right" />; },
  Search: function Search() { return <div data-testid="search-icon" />; },
  PenSquare: function PenSquare() { return <div data-testid="pen-icon" />; },
  FileText: function FileText() { return <div data-testid="file-icon" />; },
}));
jest.mock('next/link', () => {
  return function MockLink({ children, href, className, ...rest }: { children: React.ReactNode; href: string; className?: string; [key: string]: unknown }) {
    return (
      <a href={href} className={className} {...rest}>{children}</a>
    );
  };
});

describe('DraftManagerSidebar', () => {
  const mockToggleSidebar = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const setup = (isOpen = true, currentArticleId = 'article-a-uuid') => {
    return render(
      <DraftManagerSidebar
        isOpen={isOpen}
        toggleSidebar={mockToggleSidebar}
        currentArticleId={currentArticleId}
      />
    );
  };

  test('shows loading state initially', async () => {
    // Return an unresolved promise to keep it loading
    (fetchMyArticles as jest.Mock).mockImplementation(() => new Promise(() => {}));
    setup();

    expect(screen.getByTestId('sidebar-loading')).toBeInTheDocument();
  });

  test('shows error state when API fails, without blocking', async () => {
    (fetchMyArticles as jest.Mock).mockRejectedValue(new Error('Network error'));
    setup();

    await waitFor(() => {
      expect(screen.getByText('Could not load your drafts.')).toBeInTheDocument();
    });
  });

  test('shows empty state when no editable drafts found', async () => {
    (fetchMyArticles as jest.Mock).mockResolvedValue({
      articles: [
        { id: '1', title: 'Pending Article', status: 'Pending', createdAt: '2026-07-28T00:00:00Z', updatedAt: '2026-07-28T00:00:00Z', tags: [] },
        { id: '2', title: 'Published Article', status: 'Published', createdAt: '2026-07-28T00:00:00Z', updatedAt: '2026-07-28T00:00:00Z', tags: [] },
      ],
      total: 2, page: 1, limit: 50
    });
    setup();

    await waitFor(() => {
      expect(screen.getByText('No editable drafts found.')).toBeInTheDocument();
    });
  });

  test('renders real editable drafts and filters correctly', async () => {
    (fetchMyArticles as jest.Mock).mockResolvedValue({
      articles: [
        { id: '1', title: 'Draft One', status: 'Draft', createdAt: '2026-07-28T00:00:00Z', updatedAt: '2026-07-28T00:00:00Z', tags: ['React'] },
        { id: '2', title: 'Rejected Two', status: 'Unpublished', createdAt: '2026-07-28T00:00:00Z', updatedAt: '2026-07-28T00:00:00Z', tags: [] },
        { id: '3', title: 'Pending Three', status: 'Pending', createdAt: '2026-07-28T00:00:00Z', updatedAt: '2026-07-28T00:00:00Z', tags: [] },
      ],
      total: 3, page: 1, limit: 50
    });
    setup();

    await waitFor(() => {
      expect(screen.getByText('Draft One')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Rejected Two')).toBeInTheDocument();
    expect(screen.queryByText('Pending Three')).not.toBeInTheDocument();

    // Verify tag is rendered
    expect(screen.getByText('#React')).toBeInTheDocument();

    // Local search functionality
    const searchInput = screen.getByPlaceholderText('Search drafts...');
    fireEvent.change(searchInput, { target: { value: 'reject' } });

    expect(screen.getByText('Rejected Two')).toBeInTheDocument();
    expect(screen.queryByText('Draft One')).not.toBeInTheDocument();
  });

  test('visually highlights the active article', async () => {
    (fetchMyArticles as jest.Mock).mockResolvedValue({
      articles: [
        { id: 'article-a-uuid', title: 'Active Draft', status: 'Draft', createdAt: '2026-07-28T00:00:00Z', updatedAt: '2026-07-28T00:00:00Z', tags: [] },
        { id: 'other-uuid', title: 'Other Draft', status: 'Draft', createdAt: '2026-07-28T00:00:00Z', updatedAt: '2026-07-28T00:00:00Z', tags: [] },
      ],
      total: 2, page: 1, limit: 50
    });
    
    // We pass 'article-a-uuid' as currentArticleId in setup
    setup(true, 'article-a-uuid');

    await waitFor(() => {
      expect(screen.getByText('Active Draft')).toBeInTheDocument();
    });

    const activeLink = screen.getByRole('link', { name: /Active Draft/i });
    expect(activeLink).toHaveClass('bg-brand-hover border-brand-text-primary');

    const otherLink = screen.getByRole('link', { name: /Other Draft/i });
    expect(otherLink).not.toHaveClass('bg-brand-hover border-brand-text-primary');
  });

  test('does not render hardcoded mock data', async () => {
    (fetchMyArticles as jest.Mock).mockResolvedValue({
      articles: [],
      total: 0, page: 1, limit: 50
    });
    setup();

    await waitFor(() => {
      expect(screen.getByText('No editable drafts found.')).toBeInTheDocument();
    });

    expect(screen.queryByText('Crafting Interfaces')).not.toBeInTheDocument();
    expect(screen.queryByText('State Management in 2026')).not.toBeInTheDocument();
    expect(screen.queryByText('malinduyasanjith2001')).not.toBeInTheDocument();
    expect(screen.queryByText('My Stories (2)')).not.toBeInTheDocument();
  });

  test('handles unmount safely without setting state', async () => {
    let resolveApi: (val: unknown) => void;
    const promise = new Promise((resolve) => {
      resolveApi = resolve;
    });
    (fetchMyArticles as jest.Mock).mockReturnValue(promise);

    const { unmount } = setup();

    unmount();
    
    // Resolve after unmount
    await act(async () => {
      resolveApi!({ articles: [], total: 0, page: 1, limit: 50 });
    });
    
    // If it attempts to set state, React will log a warning (though React 18 ignores it, 
    // it's good practice and the test passes if no errors are thrown).
  });
});
