import { render, screen, waitFor } from '@testing-library/react';
import { AdminDashboard } from '@/components/admin/AdminDashboard';

const mockFetchDashboardSummary = jest.fn();
const mockFetchDashboardUsers = jest.fn();
const mockFetchAllArticles = jest.fn();
const mockListAll = jest.fn();
const mockListPending = jest.fn();

jest.mock('@/lib/api/adminDashboard', () => ({
  fetchDashboardSummary: (...args: unknown[]) =>
    mockFetchDashboardSummary(...args),
  fetchDashboardUsers: (...args: unknown[]) => mockFetchDashboardUsers(...args),
}));

jest.mock('@/lib/api/articles', () => ({
  fetchAllArticles: (...args: unknown[]) => mockFetchAllArticles(...args),
}));

jest.mock('@/lib/api/techTalks', () => ({
  listAll: (...args: unknown[]) => mockListAll(...args),
}));

jest.mock('@/lib/api/reviewer.api', () => ({
  listPending: (...args: unknown[]) => mockListPending(...args),
}));

describe('AdminDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchDashboardSummary.mockResolvedValue({
      totalUsers: 12,
      publishedArticles: 8,
      pendingReviews: 3,
      approvals: 2,
      techTalks: 5,
    });
    mockFetchDashboardUsers.mockResolvedValue([
      {
        id: 'u1',
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        role: 'User',
        banned: false,
        image: null,
        createdAt: '2026-04-01T00:00:00.000Z',
      },
    ]);
    mockFetchAllArticles.mockResolvedValue({
      articles: [
        {
          id: 'a1',
          title: 'Intro to Prisma',
          authorId: 'u1',
          tags: [],
          status: 'Published',
          createdAt: '2026-04-02T00:00:00.000Z',
          updatedAt: '2026-04-02T00:00:00.000Z',
          likeCount: 0,
          commentCount: 0,
          views: 10,
          rejectionFeedback: null,
          authorName: 'Ada Lovelace',
          authorEmail: 'ada@example.com',
        },
      ],
      total: 1,
      page: 1,
      limit: 4,
    });
    mockListAll.mockResolvedValue({
      techTalks: [
        {
          id: 't1',
          title: 'Neon branching',
          description: null,
          presenters: ['Ada Lovelace'],
          tags: [],
          eventDate: '2026-05-01T00:00:00.000Z',
          slidesUrl: null,
          youtubeVideoId: null,
          status: 'published',
          createdAt: '2026-04-03T00:00:00.000Z',
          updatedAt: '2026-04-03T00:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 4,
    });
    mockListPending.mockResolvedValue({
      articles: [
        {
          id: 'p1',
          title: 'Draft for review',
          authorId: 'u1',
          authorName: 'Ada Lovelace',
          authorEmail: 'ada@example.com',
          tags: [],
          status: 'Pending',
          createdAt: '2026-04-04T00:00:00.000Z',
          updatedAt: '2026-04-04T00:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 4,
    });
  });

  it('renders summary widgets with counts', async () => {
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('admin-dashboard-widgets')).toBeInTheDocument();
    });

    expect(screen.getByTestId('widget-total-users')).toHaveTextContent('12');
    expect(screen.getByTestId('widget-published-articles')).toHaveTextContent(
      '8'
    );
    expect(screen.getByTestId('widget-pending-reviews')).toHaveTextContent('3');
    expect(screen.getByTestId('widget-approvals')).toHaveTextContent('2');
    expect(screen.getByTestId('widget-tech-talks')).toHaveTextContent('5');

    const widgetOrder = Array.from(
      screen.getByTestId('admin-dashboard-widgets').children
    ).map((node) => node.getAttribute('data-testid'));
    expect(widgetOrder).toEqual([
      'widget-approvals',
      'widget-pending-reviews',
      'widget-published-articles',
      'widget-total-users',
      'widget-tech-talks',
    ]);
  });

  it('renders preview rows and Show more links to management pages', async () => {
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    });

    expect(screen.getByText('Intro to Prisma')).toBeInTheDocument();
    expect(screen.getByText('Neon branching')).toBeInTheDocument();
    expect(screen.getByText('Draft for review')).toBeInTheDocument();

    expect(screen.getByTestId('dashboard-users-section-show-more')).toHaveAttribute(
      'href',
      '/admin/users'
    );
    expect(
      screen.getByTestId('dashboard-articles-section-show-more')
    ).toHaveAttribute('href', '/admin/articles');
    expect(
      screen.getByTestId('dashboard-techtalks-section-show-more')
    ).toHaveAttribute('href', '/admin/tech-talks');
    expect(
      screen.getByTestId('dashboard-pending-reviews-section-show-more')
    ).toHaveAttribute('href', '/reviewer/approvals');
  });

  it('requests preview lists with a page size of 4', async () => {
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(mockFetchDashboardUsers).toHaveBeenCalledWith(4);
    });

    expect(mockFetchAllArticles).toHaveBeenCalledWith({
      page: 1,
      limit: 4,
      sort: 'createdAt',
      order: 'desc',
    });
    expect(mockListAll).toHaveBeenCalledWith({
      page: 1,
      limit: 4,
      sort: 'eventDate',
      order: 'desc',
    });
    expect(mockListPending).toHaveBeenCalledWith(1, 4);
  });

  it('shows an error when the dashboard summary fails', async () => {
    mockFetchDashboardSummary.mockRejectedValue(new Error('Failed to load dashboard summary'));

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('admin-dashboard-error')).toHaveTextContent(
        'Failed to load dashboard summary'
      );
    });
  });
});
