import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

const mockFetchAllArticles = jest.fn();

jest.mock('@/lib/api/articles', () => ({
  fetchAllArticles: (...args: unknown[]) => mockFetchAllArticles(...args),
}));

jest.mock('@/components/auth/RoleGuard', () => ({
  RoleGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('gsap', () => ({
  __esModule: true,
  default: { registerPlugin: jest.fn(), to: jest.fn(), fromTo: jest.fn() },
}));

jest.mock('@gsap/react', () => ({
  useGSAP: jest.fn(),
}));

import AdminArticlesPage from '../page';

const sampleArticle = {
  id: 'a1',
  title: 'Pending Article',
  authorId: 'u1',
  tags: [],
  status: 'Pending',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  likeCount: 4,
  commentCount: 2,
  views: 42,
  rejectionFeedback: null,
  authorName: 'Alice',
  authorEmail: 'alice@example.com',
};

const sampleResult = {
  articles: [sampleArticle],
  total: 1,
  page: 1,
  limit: 12,
};

describe('AdminArticlesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchAllArticles.mockResolvedValue(sampleResult);
  });

  it('renders article rows with title, author, and views', async () => {
    render(<AdminArticlesPage />);

    await waitFor(() => {
      expect(screen.getByText('Pending Article')).toBeInTheDocument();
    });

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByTestId('article-status-badge')).toHaveTextContent(
      'Pending'
    );
  });

  it('requests the list with default paging, sort, and no status filter', async () => {
    render(<AdminArticlesPage />);

    await waitFor(() => {
      expect(mockFetchAllArticles).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 12,
          status: undefined,
          sort: 'createdAt',
          order: 'desc',
        })
      );
    });
  });

  it('links each row to the admin article details page', async () => {
    render(<AdminArticlesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('article-link-a1')).toHaveAttribute(
        'href',
        '/admin/articles/a1'
      );
    });
  });

  it('refetches with the selected status filter', async () => {
    render(<AdminArticlesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('status-filter-select')).toBeInTheDocument();
    });
    mockFetchAllArticles.mockClear();

    await userEvent.selectOptions(
      screen.getByTestId('status-filter-select'),
      'Pending'
    );

    await waitFor(() => {
      expect(mockFetchAllArticles).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'Pending', limit: 12, page: 1 })
      );
    });
  });

  it('does not offer Draft as a status filter option', async () => {
    render(<AdminArticlesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('status-filter-select')).toBeInTheDocument();
    });

    const options = Array.from(
      screen.getByTestId('status-filter-select').querySelectorAll('option')
    ).map((o) => o.getAttribute('value'));
    expect(options).toEqual(['All', 'Pending', 'Published', 'Unpublished']);
  });

  it('shows an empty state when no articles are returned', async () => {
    mockFetchAllArticles.mockResolvedValue({
      articles: [],
      total: 0,
      page: 1,
      limit: 12,
    });

    render(<AdminArticlesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });
  });

  it('shows the error banner when loading fails', async () => {
    mockFetchAllArticles.mockRejectedValue(
      new Error('Insufficient permissions')
    );

    render(<AdminArticlesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('error-banner')).toHaveTextContent(
        'Insufficient permissions'
      );
    });
  });
});
