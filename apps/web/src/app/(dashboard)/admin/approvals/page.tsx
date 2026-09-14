'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Eye, Send } from 'lucide-react';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { UserRoleValue } from '@repo/shared';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ConfirmationModal } from '@/components/shared/ConfirmationModal';
import { Toast } from '@/components/shared/Toast';
import { PageLoader } from '@/components/shared/PageLoader';
import { useToast } from '@/lib/hooks/useToast';
import { formatDate } from '@/lib/utils/date';
import {
  fetchAllArticles,
  publishArticleAsAdmin,
  type AdminArticleListItem,
} from '@/lib/api/articles';

const PAGE_SIZE = 20;

function AdminApprovalsContent(): React.JSX.Element {
  const [articles, setArticles] = useState<AdminArticleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingPublish, setPendingPublish] =
    useState<AdminArticleListItem | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const { toast, showToast } = useToast();

  const loadApproved = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      // 'Approved' is the hand-off state a Reviewer puts an article into;
      // publishing it is the Admin's only action in the review workflow.
      const result = await fetchAllArticles({
        page: 1,
        limit: PAGE_SIZE,
        status: 'Approved',
        sort: 'createdAt',
        order: 'desc',
      });
      setArticles(result.articles);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApproved();
  }, [loadApproved]);

  const handlePublishConfirm = async (): Promise<void> => {
    if (!pendingPublish) return;

    setIsPublishing(true);
    try {
      await publishArticleAsAdmin(pendingPublish.id);
      setArticles((prev) => prev.filter((a) => a.id !== pendingPublish.id));
      setPendingPublish(null);
      showToast('Article published successfully', 'success');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to publish article',
        'error'
      );
    } finally {
      setIsPublishing(false);
    }
  };

  if (loading) {
    return <PageLoader testId="admin-approvals-loading" />;
  }

  const isListEmpty = articles.length === 0;

  return (
    <div
      className="max-w-5xl mx-auto p-4 sm:p-6"
      data-testid="admin-approvals-page"
    >
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-text-primary font-display">
          Approvals
        </h1>
        <p className="text-sm text-brand-text-secondary mt-1">
          Articles approved by a Reviewer and awaiting publication.
        </p>
      </div>

      {error && (
        <div
          className="mb-6 p-4 bg-brand-red/10 border border-brand-red/20 rounded text-brand-red text-sm"
          data-testid="admin-approvals-error"
        >
          {error}
        </div>
      )}

      {!error && isListEmpty && (
        <div
          className="py-16 text-center text-brand-text-secondary text-sm bg-brand-surface border border-brand-border rounded"
          data-testid="admin-approvals-empty"
        >
          No articles awaiting publication.
        </div>
      )}

      {!error && !isListEmpty && (
        <div className="flex flex-col gap-4" data-testid="admin-approvals-list">
          {articles.map((article) => (
            <div
              key={article.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-brand-surface border border-brand-border rounded"
              data-testid={`approved-article-card-${article.id}`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <StatusBadge status={article.status} />
                  <span className="text-xs text-brand-text-secondary">
                    Approved: {formatDate(article.updatedAt)}
                  </span>
                </div>
                <h2 className="text-base font-semibold text-brand-text-primary truncate">
                  {article.title}
                </h2>
                <p className="text-xs text-brand-text-secondary mt-1">
                  Author:{' '}
                  <span className="font-medium text-brand-text-primary">
                    {article.authorName}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <Link
                  href={`/admin/articles/${article.id}?from=approvals`}
                  data-testid={`view-approved-article-${article.id}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-brand-border text-brand-text-secondary hover:bg-brand-hover text-xs font-bold transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View
                </Link>
                <button
                  type="button"
                  onClick={() => setPendingPublish(article)}
                  data-testid={`publish-article-${article.id}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-brand-red hover:bg-brand-red-hover text-white text-xs font-bold transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  Publish
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmationModal
        isOpen={pendingPublish !== null}
        title="Publish Article"
        message={`Are you sure you want to publish "${pendingPublish?.title ?? ''}"? It will become publicly visible immediately.`}
        confirmText="Publish"
        cancelText="Cancel"
        onConfirm={handlePublishConfirm}
        onCancel={() => setPendingPublish(null)}
        isConfirming={isPublishing}
      />

      <Toast visible={toast.visible} message={toast.message} type={toast.type} />
    </div>
  );
}

export default function AdminApprovalsPage(): React.JSX.Element {
  return (
    <RoleGuard allowedRoles={[UserRoleValue.Admin]}>
      <AdminApprovalsContent />
    </RoleGuard>
  );
}
