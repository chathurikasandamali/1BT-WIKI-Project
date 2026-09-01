import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ArticleDetail } from '@/lib/api/reviewer.api';

const mockPush = jest.fn();
const mockParams = { id: 'article-123' };

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => mockParams,
}));

const mockUseUser = jest.fn();
jest.mock('@/lib/hooks/useUser', () => ({
  useUser: () => mockUseUser(),
}));

const mockGetArticleForReview = jest.fn();
const mockApprove = jest.fn();
const mockReject = jest.fn();
const mockCreateReviewComment = jest.fn();
const mockUpdateCommentStatus = jest.fn();

jest.mock('@/lib/api/reviewer.api', () => ({
  getArticleForReview: (...args: unknown[]) => mockGetArticleForReview(...args),
  approve: (...args: unknown[]) => mockApprove(...args),
  reject: (...args: unknown[]) => mockReject(...args),
  createReviewComment: (...args: unknown[]) => mockCreateReviewComment(...args),
  updateCommentStatus: (...args: unknown[]) => mockUpdateCommentStatus(...args),
}));

jest.mock('gsap', () => ({
  __esModule: true,
  default: { registerPlugin: jest.fn(), to: jest.fn(), fromTo: jest.fn() },
}));

jest.mock('@gsap/react', () => ({
  useGSAP: jest.fn(),
}));

jest.mock('@/components/article-detail/ArticleContent', () => ({
  ArticleContent: ({ onSelectionChange, onClickHighlight }: {
    onSelectionChange?: (range: { from: number; to: number }, text: string) => void;
    onClickHighlight?: (commentId: string) => void;
  }) => (
    <div data-testid="mock-article-content">
      <button
        type="button"
        data-testid="mock-trigger-selection"
        onClick={() => onSelectionChange?.({ from: 10, to: 30 }, 'selected text sample')}
      >
        Trigger Selection
      </button>
      <button
        type="button"
        data-testid="mock-trigger-click-highlight"
        onClick={() => onClickHighlight?.('comment-1')}
      >
        Click Highlight
      </button>
    </div>
  ),
}));

import ReviewArticleDetailPage from '../page';

function makeArticleDetail(overrides: Partial<ArticleDetail> = {}): ArticleDetail {
  return {
    id: 'article-123',
    title: 'Pending Review Article Title',
    body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Article text content' }] }] },
    authorId: 'user-1',
    authorName: 'John Author',
    authorEmail: 'john@1billiontech.com',
    tags: ['review', 'architecture'],
    status: 'Pending',
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-01-15T10:00:00.000Z',
    ...overrides,
  };
}

describe('ReviewArticleDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUser.mockReturnValue({
      user: { id: 'rev1', name: 'Reviewer User', role: 'Reviewer', email: 'rev@1billiontech.com' },
      loading: false,
    });
  });

  it('renders permission denied message when user is not Reviewer or Admin', () => {
    mockUseUser.mockReturnValue({
      user: { id: 'u1', name: 'Regular User', role: 'User', email: 'user@1billiontech.com' },
      loading: false,
    });

    render(<ReviewArticleDetailPage />);

    expect(screen.getByText(/you don't have permission to view this page/i)).toBeInTheDocument();
  });

  it('shows loading state while fetching article', () => {
    mockGetArticleForReview.mockReturnValue(new Promise(() => {}));

    render(<ReviewArticleDetailPage />);

    expect(screen.getByTestId('review-article-loading')).toHaveTextContent(
      'Loading article for review...'
    );
  });

  it('shows error state when fetching fails or article is no longer Pending', async () => {
    mockGetArticleForReview.mockRejectedValueOnce(
      new Error('Only Pending articles can be reviewed')
    );

    render(<ReviewArticleDetailPage />);

    expect(await screen.findByTestId('review-article-error')).toHaveTextContent(
      'Only Pending articles can be reviewed'
    );
  });

  it('renders article title, author, status badge, and content correctly', async () => {
    const article = makeArticleDetail();
    mockGetArticleForReview.mockResolvedValueOnce({ article, review: null });

    render(<ReviewArticleDetailPage />);

    expect(await screen.findByRole('heading', { name: 'Pending Review Article Title' })).toBeInTheDocument();
    expect(screen.getByText('John Author')).toBeInTheDocument();
    expect(screen.getByTestId('article-status-badge')).toHaveTextContent('Pending');
    expect(screen.getByTestId('review-article-content')).toBeInTheDocument();
    expect(screen.getByText('#review')).toBeInTheDocument();
  });

  it('handles approve flow: opens modal, calls approve API, and navigates back', async () => {
    const article = makeArticleDetail();
    mockGetArticleForReview.mockResolvedValueOnce({ article, review: null });
    mockApprove.mockResolvedValueOnce({});

    render(<ReviewArticleDetailPage />);

    await screen.findByRole('heading', { name: 'Pending Review Article Title' });

    expect(screen.getByTestId('approve-button')).toHaveTextContent(
      'Approve & Send to Admin'
    );
    expect(screen.queryByText(/Approve & Publish/i)).not.toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByTestId('approve-button'));

    expect(screen.getByRole('heading', { name: 'Approve Article' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Are you sure you want to approve "Pending Review Article Title"? It will be sent to Admin for publication and will not be published immediately.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByText(/Approve & Publish/i)).not.toBeInTheDocument();

    const confirmBtn = screen
      .getAllByRole('button', { name: 'Approve & Send to Admin' })
      .pop()!;
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(mockApprove).toHaveBeenCalledWith('article-123');
      expect(mockPush).toHaveBeenCalledWith('/reviewer/approvals');
    });

    expect(
      await screen.findByText('Article approved and sent to Admin for publication')
    ).toBeInTheDocument();
    expect(screen.queryByText(/Article published/i)).not.toBeInTheDocument();
  });

  it('handles reject flow: opens modal, accepts feedback, calls reject API, and navigates back', async () => {
    const article = makeArticleDetail();
    mockGetArticleForReview.mockResolvedValueOnce({ article, review: null });
    mockReject.mockResolvedValueOnce({});

    render(<ReviewArticleDetailPage />);

    await screen.findByRole('heading', { name: 'Pending Review Article Title' });

    const user = userEvent.setup();
    await user.click(screen.getByTestId('reject-button'));

    expect(screen.getByRole('heading', { name: 'Reject Article' })).toBeInTheDocument();

    const input = screen.getByTestId('reject-feedback-input');
    await user.type(input, 'Rejection feedback with enough characters');

    const rejectBtn = screen.getAllByRole('button', { name: 'Reject Article' }).pop()!;
    await user.click(rejectBtn);

    await waitFor(() => {
      expect(mockReject).toHaveBeenCalledWith('article-123', 'Rejection feedback with enough characters');
      expect(mockPush).toHaveBeenCalledWith('/reviewer/approvals');
    });
  });

  it('does not render comments sidebar initially when comments list is empty', async () => {
    const article = makeArticleDetail();
    mockGetArticleForReview.mockResolvedValueOnce({ article, review: null });

    render(<ReviewArticleDetailPage />);

    await screen.findByRole('heading', { name: 'Pending Review Article Title' });
    expect(screen.queryByTestId('review-comments-sidebar')).not.toBeInTheDocument();
  });

  it('renders comments sidebar immediately when existing comments are returned on load', async () => {
    const article = makeArticleDetail();
    const mockReview = {
      id: 'review-123',
      status: 'Pending',
      feedback: null,
      comments: [
        {
          id: 'comment-1',
          reviewId: 'review-123',
          comment: 'Please check this section.',
          selectedText: 'Article text content',
          anchorData: { from: 1, to: 20 },
          status: 'Open',
          createdBy: 'rev-1',
          createdAt: '2026-01-15T12:00:00.000Z',
          updatedAt: '2026-01-15T12:00:00.000Z',
        },
      ],
    };
    mockGetArticleForReview.mockResolvedValueOnce({ article, review: mockReview });

    render(<ReviewArticleDetailPage />);

    await screen.findByRole('heading', { name: 'Pending Review Article Title' });
    expect(await screen.findByTestId('review-comments-sidebar')).toBeInTheDocument();
    expect(screen.getByText('Please check this section.')).toBeInTheDocument();
  });

  it('handles inline comment creation: shows Add Feedback button, opens popover, calls API and updates sidebar', async () => {
    const article = makeArticleDetail();
    mockGetArticleForReview.mockResolvedValueOnce({ article, review: null });
    const mockNewComment = {
      id: 'new-comment-uuid',
      reviewId: 'review-123',
      comment: 'Please refine this definition.',
      selectedText: 'selected text sample',
      anchorData: { from: 10, to: 30 },
      status: 'Open',
      createdBy: 'rev-1',
      createdAt: '2026-08-31T12:00:00.000Z',
      updatedAt: '2026-08-31T12:00:00.000Z',
    };
    mockCreateReviewComment.mockResolvedValueOnce(mockNewComment);

    render(<ReviewArticleDetailPage />);

    await screen.findByRole('heading', { name: 'Pending Review Article Title' });

    // 1. Sidebar is not visible initially
    expect(screen.queryByTestId('review-comments-sidebar')).not.toBeInTheDocument();

    const user = userEvent.setup();

    // 2. Trigger selection selection in the mock editor
    await user.click(screen.getByTestId('mock-trigger-selection'));

    // 3. Add Feedback button should be visible
    const addFeedbackBtn = await screen.findByTestId('add-feedback-btn');
    expect(addFeedbackBtn).toBeInTheDocument();

    // 4. Click Add Feedback button to open the popover
    await user.click(addFeedbackBtn);
    expect(screen.getByTestId('comment-popover')).toBeInTheDocument();
    expect(screen.getByText(/"selected text sample"/i)).toBeInTheDocument();

    // 5. Type comment and submit
    await user.type(screen.getByTestId('comment-textarea'), 'Please refine this definition.');
    await user.click(screen.getByTestId('submit-comment-button'));

    // 6. Verify API was called with correct data
    await waitFor(() => {
      expect(mockCreateReviewComment).toHaveBeenCalledWith('article-123', {
        comment: 'Please refine this definition.',
        selectedText: 'selected text sample',
        anchorData: { from: 10, to: 30 },
      });
    });

    // 7. Verify comments sidebar is now visible and has the new comment
    expect(await screen.findByTestId('review-comments-sidebar')).toBeInTheDocument();
    expect(screen.getByText('Please refine this definition.')).toBeInTheDocument();
  });

  it('correctly calculates popover coordinates and clamps to render below when selection is near the top', async () => {
    const article = makeArticleDetail();
    mockGetArticleForReview.mockResolvedValueOnce({ article, review: null });
    
    // Mock window.getSelection and range.getBoundingClientRect
    const originalGetSelection = window.getSelection;
    const mockGetSelection = jest.fn();
    window.getSelection = mockGetSelection;

    render(<ReviewArticleDetailPage />);
    await screen.findByRole('heading', { name: 'Pending Review Article Title' });

    const user = userEvent.setup();

    // Test case 1: Selection is in the middle of the page (not near the top)
    const mockRangeMiddle = {
      getBoundingClientRect: jest.fn().mockReturnValue({
        top: 250,
        bottom: 270,
        left: 400,
        width: 120,
        height: 20,
      }),
    };
    mockGetSelection.mockReturnValue({
      rangeCount: 1,
      getRangeAt: () => mockRangeMiddle,
    });

    // Trigger selection
    await user.click(screen.getByTestId('mock-trigger-selection'));

    const addFeedbackBtn = await screen.findByTestId('add-feedback-btn');
    expect(addFeedbackBtn).toBeInTheDocument();
    
    // Check computed styles on the button
    // top = 250 - 0 = 250px
    // left = 400 - 0 + 120 / 2 = 460px
    // transform = translate(-50%, -100%) (since not near the top)
    expect(addFeedbackBtn).toHaveStyle({
      position: 'absolute',
      top: '250px',
      left: '460px',
      transform: 'translate(-50%, -100%)',
    });

    // Open popover and verify popover style
    await user.click(addFeedbackBtn);
    const popover = screen.getByTestId('comment-popover');
    expect(popover).toHaveClass('absolute');
    expect(popover).toHaveStyle({
      top: '250px',
      left: '460px',
      transform: 'translate(-50%, -100%)',
    });

    // Cancel popover to clear state
    await user.click(screen.getByTestId('cancel-comment-button'));

    // Test case 2: Selection is near the top of the viewport (top < 80)
    const mockRangeTop = {
      getBoundingClientRect: jest.fn().mockReturnValue({
        top: 50,
        bottom: 70,
        left: 300,
        width: 100,
        height: 20,
      }),
    };
    mockGetSelection.mockReturnValue({
      rangeCount: 1,
      getRangeAt: () => mockRangeTop,
    });

    // Trigger selection again
    await user.click(screen.getByTestId('mock-trigger-selection'));
    
    const addFeedbackBtnTop = await screen.findByTestId('add-feedback-btn');
    // top = bottom - containerRect.top = 70 - 0 = 70px
    // left = 300 - 0 + 100 / 2 = 350px
    // transform = translate(-50%, 0) (since near the top, positionBelow is true)
    expect(addFeedbackBtnTop).toHaveStyle({
      position: 'absolute',
      top: '70px',
      left: '350px',
      transform: 'translate(-50%, 0)',
    });

    // Open popover and verify popover style
    await user.click(addFeedbackBtnTop);
    const popoverTop = screen.getByTestId('comment-popover');
    expect(popoverTop).toHaveClass('absolute');
    expect(popoverTop).toHaveStyle({
      top: '70px',
      left: '350px',
      transform: 'translate(-50%, 0)',
    });

    // Restore original getSelection
    window.getSelection = originalGetSelection;
  });
});
