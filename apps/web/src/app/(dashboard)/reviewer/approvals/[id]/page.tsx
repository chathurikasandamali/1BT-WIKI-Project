'use client';

import React, { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ConfirmationModal } from '@/components/shared/ConfirmationModal';
import { RejectModal } from '@/components/reviewer/RejectModal';
import { Toast } from '@/components/shared/Toast';
import { ArticleContent } from '@/components/article-detail/ArticleContent';
import { useArticleForReview, approveArticle, rejectArticle } from '@/lib/hooks/useReviewer';
import { useToast } from '@/lib/hooks/useToast';
import { formatDate } from '@/lib/utils/date';
import { CommentPopover } from '@/components/reviewer/CommentPopover';
import { ReviewCommentsList } from '@/components/reviewer/ReviewCommentsList';

function ReviewArticleDetailContent(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) || '';

  const {
    article,
    comments,
    isLoading,
    error,
    addComment,
    updateComment,
  } = useArticleForReview(id);
  const { toast, showToast } = useToast();

  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  // Comments & Selection States
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [activeSelectionRange, setActiveSelectionRange] = useState<{ from: number; to: number } | null>(null);
  const [activeSelectedText, setActiveSelectedText] = useState<string>('');
  const [popoverCoords, setPopoverCoords] = useState<{ top: number; left: number; positionBelow?: boolean } | null>(null);
  const [isCommentPopoverOpen, setIsCommentPopoverOpen] = useState(false);
  const [showAddFeedbackButton, setShowAddFeedbackButton] = useState(false);

  // Dismiss selection popover on scroll to prevent drift
  React.useEffect(() => {
    const handleScroll = () => {
      if (isCommentPopoverOpen || showAddFeedbackButton) {
        setIsCommentPopoverOpen(false);
        setShowAddFeedbackButton(false);
        setActiveSelectionRange(null);
        setActiveSelectedText('');
        setPopoverCoords(null);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isCommentPopoverOpen, showAddFeedbackButton]);

  const handleSelectionChange = useCallback(
    (range: { from: number; to: number } | null, text: string) => {
      if (range && text.trim()) {
        setActiveSelectionRange(range);
        setActiveSelectedText(text);
        
        // Calculate coords relative to the container element
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const r = selection.getRangeAt(0);
          const rect = typeof r.getBoundingClientRect === 'function'
            ? r.getBoundingClientRect()
            : { top: 0, left: 0, width: 0, height: 0, bottom: 0 };
          
          const container = document.querySelector('[data-testid="review-article-page"]');
          const containerRect = container
            ? container.getBoundingClientRect()
            : { top: 0, left: 0 };

          // Determine if we should position below the text (boundary clamping if rect.top is close to top of viewport)
          const positionBelow = rect.top < 80;

          let top = positionBelow
            ? (rect.bottom || rect.top) - containerRect.top
            : rect.top - containerRect.top;
          let left = rect.left - containerRect.left + (rect.width || 0) / 2;

          // Fallback for tests/JSDOM where client rect width/height is 0 and position is 0
          if (rect.width === 0 && rect.height === 0 && rect.top === 0 && rect.left === 0) {
            top = 150;
            left = 300;
          }

          setPopoverCoords({ top, left, positionBelow });
          setShowAddFeedbackButton(true);
        } else {
          // Fallback if window selection is not available (e.g. testing)
          setPopoverCoords({ top: 150, left: 300, positionBelow: false });
          setShowAddFeedbackButton(true);
        }
      } else {
        if (!isCommentPopoverOpen) {
          setShowAddFeedbackButton(false);
          setActiveSelectionRange(null);
          setActiveSelectedText('');
          setPopoverCoords(null);
        }
      }
    },
    [isCommentPopoverOpen]
  );

  const handleApproveConfirm = async () => {
    if (!id) return;
    setIsApproving(true);
    try {
      await approveArticle(id);
      showToast('Article approved and sent to Admin for publication', 'success');
      setIsApproveModalOpen(false);
      router.push('/reviewer/approvals');
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setIsApproving(false);
    }
  };

  const handleRejectConfirm = async (feedback: string) => {
    if (!id) return;
    setIsRejecting(true);
    try {
      await rejectArticle(id, feedback);
      showToast('Article rejected successfully', 'success');
      setIsRejectModalOpen(false);
      router.push('/reviewer/approvals');
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setIsRejecting(false);
    }
  };

  const hasError = Boolean(error);
  const isArticleMissing = !article;
  const showErrorMessage = hasError || isArticleMissing;

  if (isLoading) {
    return (
      <div
        className="p-8 flex justify-center items-center text-brand-text-secondary"
        data-testid="review-article-loading"
      >
        Loading article for review...
      </div>
    );
  }

  if (showErrorMessage) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="mb-4">
          <Link
            href="/reviewer/approvals"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-text-secondary hover:text-brand-red transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to list
          </Link>
        </div>
        <div
          className="p-4 bg-brand-red/10 border border-brand-red/20 rounded text-brand-red text-sm"
          data-testid="review-article-error"
        >
          {error || 'Article not found'}
        </div>
      </div>
    );
  }

  const formattedDate = formatDate(article.updatedAt);
  const hasTags = Boolean(article.tags && article.tags.length > 0);
  const hasComments = comments.length > 0;
  const containerMaxWidth = hasComments ? 'max-w-7xl' : 'max-w-4xl';

  // Map backend comments to editor highlight structure
  const highlights = comments.map((c) => ({
    id: c.id,
    from: c.anchorData?.from ?? 0,
    to: c.anchorData?.to ?? 0,
    status: c.status,
  }));

  return (
    <div className={`${containerMaxWidth} mx-auto p-4 sm:p-6 relative`} data-testid="review-article-page">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/reviewer/approvals"
          className="inline-flex items-center gap-1 text-sm font-medium text-brand-text-secondary hover:text-brand-red transition-colors"
          data-testid="back-to-list-link"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to list
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsApproveModalOpen(true)}
            data-testid="approve-button"
            className="flex items-center gap-1.5 px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white text-sm font-bold transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            Approve &amp; Send to Admin
          </button>

          <button
            type="button"
            onClick={() => setIsRejectModalOpen(true)}
            data-testid="reject-button"
            className="flex items-center gap-1.5 px-4 py-2 rounded border border-brand-red text-brand-red hover:bg-brand-red hover:text-white text-sm font-bold transition-colors"
          >
            <XCircle className="w-4 h-4" />
            Reject
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-stretch">
        <article className="flex-1 bg-brand-surface rounded-xl shadow-sm border border-brand-border overflow-hidden">
          <div className="p-6 md:p-10 border-b border-brand-border">
            <div className="flex items-center gap-3 mb-4">
              <StatusBadge status={article.status} />
              <span className="text-xs text-brand-text-secondary">
                Submitted: {formattedDate}
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-display font-bold text-brand-text-primary leading-tight mb-4">
              {article.title}
            </h1>

            <div className="flex items-center gap-2 text-sm text-brand-text-secondary mb-4">
              Author: <span className="font-medium text-brand-text-primary">{article.authorName}</span>
            </div>

            {hasTags ? (
              <div className="flex flex-wrap gap-2">
                {article.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-0.5 rounded-full bg-brand-bg text-brand-text-secondary text-xs font-semibold uppercase tracking-wider"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="p-6 md:p-10 bg-white" data-testid="review-article-content">
            <ArticleContent
              body={article.body}
              comments={highlights}
              onSelectionChange={handleSelectionChange}
              onClickHighlight={(commentId) => setActiveCommentId(commentId)}
              activeCommentId={activeCommentId}
            />
          </div>
        </article>

        {hasComments && (
          <aside className="w-full lg:w-80 shrink-0">
            <ReviewCommentsList
              comments={comments}
              activeCommentId={activeCommentId}
              onClickComment={(commentId) => setActiveCommentId(commentId)}
              onUpdateCommentStatus={async (commentId, status) => {
                try {
                  await updateComment(commentId, status);
                  showToast(`Comment status updated to ${status}`, 'success');
                } catch (err) {
                  showToast(err instanceof Error ? err.message : String(err), 'error');
                }
              }}
            />
          </aside>
        )}
      </div>

      {showAddFeedbackButton && !isCommentPopoverOpen && popoverCoords && (
        <button
          type="button"
          onClick={() => setIsCommentPopoverOpen(true)}
          style={{
            position: 'absolute',
            top: `${popoverCoords.top}px`,
            left: `${popoverCoords.left}px`,
            transform: popoverCoords.positionBelow ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
            marginTop: popoverCoords.positionBelow ? '8px' : '-8px',
          }}
          data-testid="add-feedback-btn"
          className="z-40 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-red hover:bg-brand-red-hover text-white text-xs font-bold shadow-lg transition-all animate-scale-in"
        >
          Add Feedback
        </button>
      )}

      <CommentPopover
        isOpen={isCommentPopoverOpen}
        selectedText={activeSelectedText}
        coords={popoverCoords}
        onSubmit={async (commentText) => {
          try {
            if (!activeSelectionRange) return;
            await addComment(commentText, activeSelectedText, activeSelectionRange);
            showToast('Feedback comment added successfully', 'success');
            setIsCommentPopoverOpen(false);
            setShowAddFeedbackButton(false);
            setActiveSelectionRange(null);
            setActiveSelectedText('');
            setPopoverCoords(null);
          } catch (err) {
            showToast(err instanceof Error ? err.message : String(err), 'error');
          }
        }}
        onCancel={() => {
          setIsCommentPopoverOpen(false);
          setShowAddFeedbackButton(false);
          setActiveSelectionRange(null);
          setActiveSelectedText('');
          setPopoverCoords(null);
        }}
      />

      <ConfirmationModal
        isOpen={isApproveModalOpen}
        title="Approve Article"
        message={`Are you sure you want to approve "${article.title}"? It will be sent to Admin for publication and will not be published immediately.`}
        confirmText="Approve & Send to Admin"
        cancelText="Cancel"
        onConfirm={handleApproveConfirm}
        onCancel={() => setIsApproveModalOpen(false)}
        isConfirming={isApproving}
      />

      <RejectModal
        isOpen={isRejectModalOpen}
        articleId={article.id}
        articleTitle={article.title}
        onConfirm={handleRejectConfirm}
        onCancel={() => setIsRejectModalOpen(false)}
        isLoading={isRejecting}
      />

      <Toast visible={toast.visible} message={toast.message} type={toast.type} />
    </div>
  );
}

export default function ReviewArticleDetailPage(): React.JSX.Element {
  return (
    <RoleGuard allowedRoles={['Reviewer', 'Admin']}>
      <ReviewArticleDetailContent />
    </RoleGuard>
  );
}
