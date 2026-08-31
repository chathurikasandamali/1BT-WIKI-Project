'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { RoleGuard } from '@/components/auth/RoleGuard';
import {
  getArticle,
  publishArticleAsAdmin,
  type ArticleDetail,
} from '@/lib/api/articles';
import { ArticleContent } from '@/components/article-detail/ArticleContent';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ArrowLeftIcon } from '@/components/shared/icons/ArrowLeftIcon';
import { ConfirmationModal } from '@/components/shared/ConfirmationModal';
import { Toast } from '@/components/shared/Toast';
import { useToast } from '@/lib/hooks/useToast';

interface AdminArticlePageProps {
  params: Promise<{ id: string }>;
}

const formatDate = (value: string): string =>
  new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

function AdminArticleDetailContent({
  id,
}: {
  id: string;
}): React.JSX.Element {
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const { toast, showToast } = useToast();

  useEffect(() => {
    let mounted = true;
    async function loadArticle() {
      try {
        setLoading(true);
        const data = await getArticle(id);
        if (mounted) {
          setArticle(data);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error ? err.message : 'Failed to load article'
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadArticle();
    return () => {
      mounted = false;
    };
  }, [id]);

  const handlePublishConfirm = async (): Promise<void> => {
    if (!article || article.status !== 'Approved' || isPublishing) return;

    setIsPublishing(true);
    try {
      const publishedArticle = await publishArticleAsAdmin(article.id);
      setArticle(publishedArticle);
      setIsPublishModalOpen(false);
      showToast('Article published successfully', 'success');
    } catch (err) {
      setIsPublishModalOpen(false);
      showToast(
        err instanceof Error ? err.message : 'Failed to publish article',
        'error'
      );
    } finally {
      setIsPublishing(false);
    }
  };

  if (loading) {
    return (
      <div
        className="max-w-4xl mx-auto px-4 py-8 text-center text-brand-text-secondary"
        data-testid="loading-skeleton"
      >
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-64 bg-brand-border rounded mb-4"></div>
          <div className="h-4 w-32 bg-brand-border rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <p className="text-brand-red font-medium mb-4" data-testid="error-message">
          {error || 'Article not found'}
        </p>
        <Link
          href="/admin/articles"
          className="inline-flex items-center text-sm font-medium text-brand-text-secondary hover:text-brand-red transition-colors"
        >
          <ArrowLeftIcon width="16" height="16" className="mr-1" />
          Back to Article Management
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/admin/articles"
          className="inline-flex items-center text-sm font-medium text-brand-text-secondary hover:text-brand-red transition-colors"
          data-testid="back-link"
        >
          <ArrowLeftIcon width="16" height="16" className="mr-1" />
          Back to Article Management
        </Link>

        {article.status === 'Approved' && (
          <button
            type="button"
            onClick={() => setIsPublishModalOpen(true)}
            disabled={isPublishing}
            className="px-5 py-2 bg-brand-red hover:bg-brand-red-hover text-white rounded text-sm font-bold shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPublishing ? 'Publishing...' : 'Publish'}
          </button>
        )}
      </div>

      <article className="bg-brand-surface rounded-xl shadow-sm border border-brand-border overflow-hidden">
        <div className="p-8 md:p-12 pb-6 border-b border-brand-border">
          <div className="flex items-center gap-3 mb-6">
            <StatusBadge status={article.status} />
            <div className="flex flex-wrap gap-2">
              {article.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full bg-brand-bg text-brand-text-secondary text-xs font-semibold uppercase tracking-wider"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl font-display font-bold text-brand-dark leading-tight mb-8">
            {article.title}
          </h1>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-brand-border flex items-center justify-center text-brand-text-secondary">
              <span className="text-sm font-medium">
                {(article.authorName ?? '?').charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p
                className="font-semibold text-brand-dark"
                data-testid="author-name"
              >
                {article.authorName ?? 'Unknown Author'}
              </p>
              {article.authorEmail && (
                <p
                  className="text-sm text-brand-text-secondary"
                  data-testid="author-email"
                >
                  {article.authorEmail}
                </p>
              )}
            </div>
          </div>

          {/* Oversight metadata */}
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <dt className="text-xs font-medium text-brand-text-secondary uppercase tracking-wider mb-1">
                Created
              </dt>
              <dd className="text-brand-text-primary">
                {formatDate(article.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-brand-text-secondary uppercase tracking-wider mb-1">
                Updated
              </dt>
              <dd className="text-brand-text-primary">
                {formatDate(article.updatedAt)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-brand-text-secondary uppercase tracking-wider mb-1">
                Views
              </dt>
              <dd className="text-brand-text-primary" data-testid="views-stat">
                {article.views ?? 0}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-brand-text-secondary uppercase tracking-wider mb-1">
                Likes · Comments
              </dt>
              <dd className="text-brand-text-primary">
                {article.likeCount} · {article.commentCount}
              </dd>
            </div>
          </dl>
        </div>

        <div className="p-8 md:p-12 bg-white">
          <ArticleContent body={article.body} />
        </div>
      </article>

      <ConfirmationModal
        isOpen={isPublishModalOpen}
        title="Publish Article"
        message={`Are you sure you want to publish "${article.title}"? It will become publicly visible immediately.`}
        confirmText="Publish"
        cancelText="Cancel"
        onConfirm={handlePublishConfirm}
        onCancel={() => setIsPublishModalOpen(false)}
        isConfirming={isPublishing}
      />

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
      />
    </div>
  );
}

export default function AdminArticleDetailPage(
  props: AdminArticlePageProps
): React.JSX.Element {
  // In Next.js 15+, params is a Promise. We need to unwrap it in a Client Component.
  const params = React.use(props.params);

  return (
    <RoleGuard allowedRoles={['Admin']}>
      <AdminArticleDetailContent id={params.id} />
    </RoleGuard>
  );
}
