'use client';

import React, { useState } from 'react';
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

function ReviewArticleDetailContent(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) || '';

  const { article, isLoading, error } = useArticleForReview(id);
  const { toast, showToast } = useToast();

  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const handleApproveConfirm = async () => {
    if (!id) return;
    setIsApproving(true);
    try {
      await approveArticle(id);
      showToast('Article approved and published successfully', 'success');
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

  //const authorName = article.authorName || article.author?.email || article.authorId;
  const formattedDate = formatDate(article.createdAt);
  const hasTags = Boolean(article.tags && article.tags.length > 0);

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6" data-testid="review-article-page">
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
            Approve &amp; Publish
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

      <article className="bg-brand-surface rounded-xl shadow-sm border border-brand-border overflow-hidden">
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
          <ArticleContent body={article.body} />
        </div>
      </article>

      <ConfirmationModal
        isOpen={isApproveModalOpen}
        title="Approve & Publish Article"
        message={`Are you sure you want to approve and publish "${article.title}"? This will make the article visible to all users.`}
        confirmText="Approve & Publish"
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
