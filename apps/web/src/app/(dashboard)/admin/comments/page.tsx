/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useMemo, useState } from 'react';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { UserRoleValue } from '@repo/shared';
import { ConfirmationModal } from '@/components/shared/ConfirmationModal';
import { Toast } from '@/components/shared/Toast';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageLoader } from '@/components/shared/PageLoader';
import { DashboardWidget } from '@/components/admin/DashboardWidget';
import { usePendingComments } from '@/lib/hooks/useCommentModeration';
import { useToast } from '@/lib/hooks/useToast';
import { formatDate } from '@/lib/utils/date';
import { SearchIcon } from '@/components/shared/icons/SearchIcon';
import { CommentIcon } from '@/components/shared/icons/CommentIcon';
import { CheckCircleIcon } from '@/components/shared/icons/CheckCircleIcon';
import { BanIcon } from '@/components/shared/icons/BanIcon';

const DEFAULT_AVATAR = 'https://i.pravatar.cc/150?u=default';

function CommentModerationContent(): React.JSX.Element {
  const { comments, loading, error, approveComment, rejectComment } =
    usePendingComments();
  const { toast, showToast } = useToast();
  const [search, setSearch] = useState('');

  const [approveTargetId, setApproveTargetId] = useState<string | null>(null);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const visibleComments = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return comments;
    }
    return comments.filter((comment) => {
      const authorMatch = comment.authorName.toLowerCase().includes(query);
      const articleMatch = comment.articleTitle.toLowerCase().includes(query);
      const bodyMatch = comment.body.toLowerCase().includes(query);
      return authorMatch || articleMatch || bodyMatch;
    });
  }, [comments, search]);

  const handleApproveConfirm = async () => {
    if (!approveTargetId) return;
    setIsProcessing(true);
    try {
      await approveComment(approveTargetId);
      showToast('Comment approved', 'success');
      setApproveTargetId(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectTargetId) return;
    setIsProcessing(true);
    try {
      await rejectComment(rejectTargetId);
      showToast('Comment rejected', 'success');
      setRejectTargetId(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  if (error) {
    return (
      <div
        className="rounded border border-brand-red/20 bg-brand-red/10 p-4 text-sm text-brand-red"
        data-testid="pending-comments-error"
      >
        {error}
      </div>
    );
  }

  const isListEmpty = comments.length === 0;
  const hasNoMatches = !isListEmpty && visibleComments.length === 0;

  let emptyTitle = 'No comments pending approval.';
  let emptyDescription =
    'New comments will appear here when they need a moderation decision.';
  if (hasNoMatches) {
    emptyTitle = 'No pending comments match your search.';
    emptyDescription = 'Try a different author, article, or comment text.';
  }

  return (
    <div className="mx-auto max-w-6xl p-8" data-testid="admin-comments-page">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-brand-text-primary">
          Comment Moderation
        </h1>
        <p className="mt-1 text-sm text-brand-text-secondary">
          Review and approve or reject comments awaiting moderation.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DashboardWidget
          label="Pending comments"
          description="Waiting for approve or reject"
          value={comments.length}
          icon={<CommentIcon className="h-4 w-4" />}
          valueClassName="text-amber-600"
          iconClassName="bg-amber-50 text-amber-700"
          borderClassName="border-amber-200"
          highlight={comments.length > 0}
          testId="widget-pending-comments"
        />
      </div>

      <section className="overflow-visible rounded border border-brand-border bg-brand-surface shadow-sm">
        <div className="border-b border-brand-border bg-brand-bg/40 px-4 py-4">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-brand-text-primary">
              Moderation queue
            </h2>
            <p className="mt-0.5 text-xs text-brand-text-secondary">
              Search by author, article, or comment text, then approve or reject.
            </p>
          </div>
          <div className="relative min-w-0 max-w-md">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
              <SearchIcon className="h-4 w-4 text-brand-text-secondary" />
            </span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search pending comments"
              data-testid="comments-search-input"
              className="w-full rounded border border-brand-border bg-brand-surface py-2.5 pl-9 pr-3 text-sm text-brand-text-primary transition-colors placeholder:text-brand-text-secondary focus:border-brand-red focus:outline-none"
            />
          </div>
        </div>

        {(isListEmpty || hasNoMatches) && (
          <EmptyState
            testId="pending-comments-empty"
            title={emptyTitle}
            description={emptyDescription}
            icon={<CommentIcon className="h-6 w-6" />}
          />
        )}

        {!isListEmpty && !hasNoMatches && (
          <div className="flex flex-col gap-3 p-4" data-testid="pending-comments-list">
            {visibleComments.map((comment) => (
              <div
                key={comment.id}
                className="flex flex-col gap-3 rounded border border-brand-border bg-brand-surface p-4"
                data-testid={`comment-card-${comment.id}`}
              >
                <div className="flex items-start gap-3">
                  <img
                    src={comment.authorImage || DEFAULT_AVATAR}
                    alt={comment.authorName}
                    className="h-8 w-8 rounded-full bg-brand-border object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-brand-text-primary">
                        {comment.authorName}
                      </span>
                      <span className="text-xs text-brand-text-secondary">
                        Submitted: {formatDate(comment.createdAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-brand-text-secondary">
                      On: <span className="font-medium">{comment.articleTitle}</span>
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-brand-text-primary">
                      {comment.body}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setApproveTargetId(comment.id)}
                    data-testid={`approve-comment-${comment.id}`}
                    className="flex items-center gap-1.5 rounded bg-green-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-green-700"
                  >
                    <CheckCircleIcon className="h-3.5 w-3.5" />
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => setRejectTargetId(comment.id)}
                    data-testid={`reject-comment-${comment.id}`}
                    className="flex items-center gap-1.5 rounded border border-brand-red px-3 py-1.5 text-xs font-bold text-brand-red transition-colors hover:bg-brand-red hover:text-white"
                  >
                    <BanIcon className="h-3.5 w-3.5" />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <ConfirmationModal
        isOpen={approveTargetId !== null}
        title="Approve this comment?"
        message="Approving this comment will make it visible to all readers."
        confirmText="Approve"
        cancelText="Cancel"
        isConfirming={isProcessing}
        onConfirm={handleApproveConfirm}
        onCancel={() => setApproveTargetId(null)}
      />

      <ConfirmationModal
        isOpen={rejectTargetId !== null}
        title="Reject this comment?"
        message="Rejecting this comment will keep it hidden from other readers."
        confirmText="Reject"
        cancelText="Cancel"
        isConfirming={isProcessing}
        onConfirm={handleRejectConfirm}
        onCancel={() => setRejectTargetId(null)}
      />

      <Toast visible={toast.visible} message={toast.message} type={toast.type} />
    </div>
  );
}

export default function AdminCommentsPage(): React.JSX.Element {
  return (
    <RoleGuard allowedRoles={[UserRoleValue.Admin]}>
      <CommentModerationContent />
    </RoleGuard>
  );
}
