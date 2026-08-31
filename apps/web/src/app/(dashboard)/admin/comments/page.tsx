/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState } from 'react';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { ConfirmationModal } from '@/components/shared/ConfirmationModal';
import { Toast } from '@/components/shared/Toast';
import { usePendingComments } from '@/lib/hooks/useCommentModeration';
import { useToast } from '@/lib/hooks/useToast';
import { formatDate } from '@/lib/utils/date';
import { CheckCircle, XCircle } from 'lucide-react';

const DEFAULT_AVATAR = 'https://i.pravatar.cc/150?u=default';

function CommentModerationContent(): React.JSX.Element {
  const { comments, loading, error, approveComment, rejectComment } =
    usePendingComments();
  const { toast, showToast } = useToast();

  const [approveTargetId, setApproveTargetId] = useState<string | null>(null);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const isListEmpty = comments.length === 0;

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
    return (
      <div className="p-8 flex justify-center items-center text-brand-text-secondary">
        Loading pending comments...
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="p-4 bg-brand-red/10 border border-brand-red/20 rounded text-brand-red text-sm"
        data-testid="pending-comments-error"
      >
        {error}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6" data-testid="admin-comments-page">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-text-primary font-display">
          Comment Moderation
        </h1>
        <p className="text-sm text-brand-text-secondary mt-1">
          Review and approve or reject comments awaiting moderation.
        </p>
      </div>

      {isListEmpty ? (
        <div
          className="py-16 text-center text-brand-text-secondary text-sm bg-brand-surface border border-brand-border rounded"
          data-testid="pending-comments-empty"
        >
          No comments pending approval.
        </div>
      ) : (
        <div className="flex flex-col gap-4" data-testid="pending-comments-list">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="flex flex-col gap-3 p-4 bg-brand-surface border border-brand-border rounded"
              data-testid={`comment-card-${comment.id}`}
            >
              <div className="flex items-start gap-3">
                <img
                  src={comment.authorImage || DEFAULT_AVATAR}
                  alt={comment.authorName}
                  className="w-8 h-8 rounded-full bg-brand-border object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-brand-text-primary">
                      {comment.authorName}
                    </span>
                    <span className="text-xs text-brand-text-secondary">
                      Submitted: {formatDate(comment.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-brand-text-secondary mt-0.5 truncate">
                    On: <span className="font-medium">{comment.articleTitle}</span>
                  </p>
                  <p className="mt-2 text-sm text-brand-text-primary whitespace-pre-wrap">
                    {comment.body}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setApproveTargetId(comment.id)}
                  data-testid={`approve-comment-${comment.id}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition-colors"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => setRejectTargetId(comment.id)}
                  data-testid={`reject-comment-${comment.id}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-brand-red text-brand-red hover:bg-brand-red hover:text-white text-xs font-bold transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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
    <RoleGuard allowedRoles={['Admin']}>
      <CommentModerationContent />
    </RoleGuard>
  );
}
