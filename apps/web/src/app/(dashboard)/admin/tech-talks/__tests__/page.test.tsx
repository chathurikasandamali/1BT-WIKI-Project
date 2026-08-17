import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockListAll = jest.fn();

jest.mock('@/lib/api/techTalks', () => ({
  listAll: (...args: unknown[]) => mockListAll(...args),
}));

jest.mock('@/lib/hooks/useTechTalks', () => ({
  useAllTechTalks: (query: unknown) => {
    // Call the real listAll mock so we can assert on it
    const { useState, useEffect } = jest.requireActual('react') as typeof import('react');
    const [state, setState] = useState({ techTalks: [], total: 0, loading: true, error: null as string | null });
    useEffect(() => {
      mockListAll(query).then(
        (r: { techTalks: unknown[]; total: number }) => setState({ techTalks: r.techTalks as never[], total: r.total, loading: false, error: null }),
        (e: Error) => setState({ techTalks: [], total: 0, loading: false, error: e.message })
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return { ...state, refetch: jest.fn() };
  },
}));

jest.mock('@/components/auth/RoleGuard', () => ({
  RoleGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('next/link', () => {
  const MockLink = ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

jest.mock('gsap', () => ({
  __esModule: true,
  default: { registerPlugin: jest.fn(), to: jest.fn(), fromTo: jest.fn() },
}));

jest.mock('@gsap/react', () => ({
  useGSAP: jest.fn(),
}));

import AdminTechTalksPage from '../page';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const draftTalk = {
  id: 'tt-1',
  title: 'Draft Talk',
  description: null,
  presenters: ['Alice'],
  tags: [],
  eventDate: '2026-09-01T10:00:00.000Z',
  slidesUrl: null,
  youtubeVideoId: null,
  status: 'draft' as const,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

const publishedTalk = {
  id: 'tt-2',
  title: 'Published Talk',
  description: 'A live talk',
  presenters: ['Bob', 'Carol'],
  tags: ['react'],
  eventDate: '2026-10-15T14:00:00.000Z',
  slidesUrl: null,
  youtubeVideoId: 'abc123',
  status: 'published' as const,
  createdAt: '2026-08-02T00:00:00.000Z',
  updatedAt: '2026-08-02T00:00:00.000Z',
};

const unpublishedTalk = {
  id: 'tt-3',
  title: 'Unpublished Talk',
  description: null,
  presenters: ['Dave'],
  tags: [],
  eventDate: '2026-07-01T09:00:00.000Z',
  slidesUrl: null,
  youtubeVideoId: null,
  status: 'unpublished' as const,
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-10T00:00:00.000Z',
};

const emptyResult = { techTalks: [], total: 0, page: 1, limit: 12 };
const sampleResult = {
  techTalks: [draftTalk, publishedTalk, unpublishedTalk],
  total: 3,
  page: 1,
  limit: 12,
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('AdminTechTalksPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: summary counts calls + main list all return valid data
    mockListAll.mockResolvedValue(sampleResult);
  });

  it('shows loading state initially', () => {
    // Keep mock pending so loading state persists
    mockListAll.mockReturnValue(new Promise(() => {}));
    render(<AdminTechTalksPage />);
    expect(screen.getByTestId('admin-techtalks-loading')).toBeInTheDocument();
  });

  it('shows empty state when no tech talks are returned', async () => {
    mockListAll.mockResolvedValue(emptyResult);
    render(<AdminTechTalksPage />);
    await waitFor(() =>
      expect(screen.getByTestId('admin-techtalks-empty')).toBeInTheDocument()
    );
  });

  it('shows error banner when fetch fails', async () => {
    mockListAll.mockRejectedValue(new Error('Server error'));
    render(<AdminTechTalksPage />);
    await waitFor(() =>
      expect(screen.getByTestId('admin-techtalks-error')).toHaveTextContent(
        'Server error'
      )
    );
  });

  it('renders rows for a mixed-status list with correct titles', async () => {
    render(<AdminTechTalksPage />);
    await waitFor(() =>
      expect(screen.getByText('Draft Talk')).toBeInTheDocument()
    );
    expect(screen.getByText('Published Talk')).toBeInTheDocument();
    expect(screen.getByText('Unpublished Talk')).toBeInTheDocument();
  });

  it('renders correct status badges for each status', async () => {
    render(<AdminTechTalksPage />);
    await waitFor(() =>
      expect(screen.getAllByTestId('techtalk-status-badge').length).toBeGreaterThan(0)
    );
    const badges = screen.getAllByTestId('techtalk-status-badge').map((b) => b.textContent);
    expect(badges).toContain('Draft');
    expect(badges).toContain('Published');
    expect(badges).toContain('Unpublished');
  });

  it('renders each row with the correct data-testid', async () => {
    render(<AdminTechTalksPage />);
    await waitFor(() =>
      expect(screen.getByTestId('techtalk-row-tt-1')).toBeInTheDocument()
    );
    expect(screen.getByTestId('techtalk-row-tt-2')).toBeInTheDocument();
    expect(screen.getByTestId('techtalk-row-tt-3')).toBeInTheDocument();
  });

  it('links each row title to the admin detail page', async () => {
    render(<AdminTechTalksPage />);
    await waitFor(() =>
      expect(screen.getByTestId('techtalk-link-tt-1')).toHaveAttribute(
        'href',
        '/admin/tech-talks/tt-1'
      )
    );
  });

  it('renders correct independent stat-card counts', async () => {
    const statsResult = {
      techTalks: [
        { ...draftTalk, id: '1' },
        { ...publishedTalk, id: '2' },
        { ...publishedTalk, id: '3' },
        { ...unpublishedTalk, id: '4' },
        { ...unpublishedTalk, id: '5' },
        { ...unpublishedTalk, id: '6' },
      ],
      total: 6,
      page: 1,
      limit: 12,
    };
    mockListAll.mockResolvedValue(statsResult);

    render(<AdminTechTalksPage />);

    await waitFor(() =>
      expect(screen.getByTestId('total-techtalks-stat')).toHaveTextContent('6')
    );
    expect(screen.getByTestId('published-techtalks-stat')).toHaveTextContent('2');
    expect(screen.getByTestId('draft-techtalks-stat')).toHaveTextContent('1');
    expect(screen.getByTestId('unpublished-techtalks-stat')).toHaveTextContent('3');
  });

  it('renders presenters joined by comma', async () => {
    render(<AdminTechTalksPage />);
    await waitFor(() =>
      expect(screen.getByText('Bob, Carol')).toBeInTheDocument()
    );
  });

  it('Create Tech Talk button links to the correct route', async () => {
    render(<AdminTechTalksPage />);
    // Button is present immediately (not behind loading gate)
    const btn = screen.getByTestId('create-techtalk-btn');
    expect(btn).toHaveAttribute('href', '/admin/tech-talks/create');
  });

  it('shows pagination controls when rows are present', async () => {
    render(<AdminTechTalksPage />);
    await waitFor(() =>
      expect(screen.getByTestId('pagination-controls')).toBeInTheDocument()
    );
  });
});