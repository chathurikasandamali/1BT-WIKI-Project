import { render, screen, waitFor, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

const mockGetArticle = jest.fn();
const mockPublishArticleAsAdmin = jest.fn();

jest.mock('@/lib/api/articles', () => ({
  getArticle: (...args: unknown[]) => mockGetArticle(...args),
  publishArticleAsAdmin: (...args: unknown[]) =>
    mockPublishArticleAsAdmin(...args),
}));

jest.mock('@/components/auth/RoleGuard', () => ({
  RoleGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/components/article-detail/ArticleContent', () => ({
  ArticleContent: () => <div data-testid="article-content">Content</div>,
}));

jest.mock('@/components/shared/ConfirmationModal', () => ({
  ConfirmationModal: ({
    isOpen,
    title,
    message,
    confirmText,
    onConfirm,
    isConfirming,
  }: {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    onConfirm: () => void;
    isConfirming?: boolean;
  }) =>
    isOpen ? (
      <div role="dialog" aria-label={title}>
        <p>{message}</p>
        <button type="button" onClick={onConfirm} disabled={isConfirming}>
          {isConfirming ? 'Processing...' : confirmText}
        </button>
      </div>
    ) : null,
}));

jest.mock('@/components/shared/Toast', () => ({
  Toast: ({
    visible,
    message,
    type,
  }: {
    visible: boolean;
    message: string;
    type: string;
  }) =>
    visible ? <div data-testid={`${type}-toast`}>{message}</div> : null,
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

  it('shows Publish for an Approved article', async () => {
    mockGetArticle.mockResolvedValue({
      ...mockArticle,
      status: 'Approved',
    });

    await renderPage();

    expect(
      await screen.findByRole('button', { name: 'Publish' })
    ).toBeInTheDocument();
  });

  it.each(['Published', 'Pending'])(
    'does not show Publish for a %s article',
    async (status) => {
      mockGetArticle.mockResolvedValue({
        ...mockArticle,
        status,
      });

      await renderPage();

      await screen.findByText('Draft Under Review');
      expect(
        screen.queryByRole('button', { name: 'Publish' })
      ).not.toBeInTheDocument();
    }
  );

  it('publishes an Approved article after confirmation', async () => {
    const approvedArticle = { ...mockArticle, status: 'Approved' };
    mockGetArticle.mockResolvedValue(approvedArticle);
    mockPublishArticleAsAdmin.mockResolvedValue({
      ...approvedArticle,
      status: 'Published',
    });

    await renderPage();

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Publish' }));

    const dialog = screen.getByRole('dialog', { name: 'Publish Article' });
    expect(
      within(dialog).getByText(/become publicly visible immediately/i)
    ).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Publish' }));

    await waitFor(() => {
      expect(mockPublishArticleAsAdmin).toHaveBeenCalledWith(mockArticleId);
    });
    expect(await screen.findByTestId('success-toast')).toHaveTextContent(
      'Article published successfully'
    );
    expect(screen.getByTestId('article-status-badge')).toHaveTextContent(
      'Published'
    );
    expect(
      screen.queryByRole('button', { name: 'Publish' })
    ).not.toBeInTheDocument();
  });

  it('keeps an Approved article publishable when publication fails', async () => {
    mockGetArticle.mockResolvedValue({
      ...mockArticle,
      status: 'Approved',
    });
    mockPublishArticleAsAdmin.mockRejectedValue(new Error('Publication failed'));

    await renderPage();

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Publish' }));
    await user.click(
      within(screen.getByRole('dialog', { name: 'Publish Article' })).getByRole(
        'button',
        { name: 'Publish' }
      )
    );

    expect(await screen.findByTestId('error-toast')).toHaveTextContent(
      'Publication failed'
    );
    expect(screen.getByTestId('article-status-badge')).toHaveTextContent(
      'Approved'
    );
    expect(
      screen.getByRole('button', { name: 'Publish' })
    ).toBeInTheDocument();
  });

  it('prevents duplicate publication while a request is in progress', async () => {
    const approvedArticle = { ...mockArticle, status: 'Approved' };
    let resolvePublication: ((article: typeof mockArticle) => void) | undefined;
    const publicationRequest = new Promise<typeof mockArticle>((resolve) => {
      resolvePublication = resolve;
    });
    mockGetArticle.mockResolvedValue(approvedArticle);
    mockPublishArticleAsAdmin.mockReturnValue(publicationRequest);

    await renderPage();

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Publish' }));
    const dialog = screen.getByRole('dialog', { name: 'Publish Article' });
    await user.click(within(dialog).getByRole('button', { name: 'Publish' }));

    const processingButton = await within(dialog).findByRole('button', {
      name: 'Processing...',
    });
    expect(processingButton).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Publishing...' })).toBeDisabled();

    await user.click(processingButton);
    expect(mockPublishArticleAsAdmin).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolvePublication?.({
        ...mockArticle,
        status: 'Published',
      });
      await publicationRequest;
    });
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
