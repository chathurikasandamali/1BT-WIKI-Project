'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Search, Pencil, Trash2, Plus } from 'lucide-react';
import Link from 'next/link';
import { fetchMyArticles, deleteArticle, type ArticleListItem } from '@/lib/api/articles';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ConfirmationModal } from '@/components/shared/ConfirmationModal';
import { Toast } from '@/components/shared/Toast';
import { ReviewFeedbackModal } from '@/components/articles/ReviewFeedbackModal';
import { useUser } from '@/lib/hooks/useUser';
import { useToast } from '@/lib/hooks/useToast';
import { formatDate } from '@/lib/utils/date';
import { cn } from '@/lib/utils';
import { ArticleReviewStatus, ArticleStatus } from '@repo/shared';

type SortOption = 'newest' | 'oldest' | 'title';

function RejectionFeedback({
  feedback,
  inlineCommentCount = 0,
  onViewFeedback,
}: {
  feedback: string | null;
  inlineCommentCount?: number;
  onViewFeedback: () => void;
}): React.JSX.Element {
  const trimmedFeedback = feedback?.trim();
  const feedbackText = trimmedFeedback ? trimmedFeedback : 'No reviewer feedback was provided.';
  const commentsLabel = `${inlineCommentCount} inline comment${inlineCommentCount === 1 ? '' : 's'}`;

  return (
    <div
      className="mt-3 p-3 bg-brand-red/5 border border-brand-red/10 rounded"
      data-testid="reviewer-feedback-banner"
    >
      <h4 className="text-xs font-semibold text-brand-red mb-1 flex items-center gap-1">
        <span>⚠ Reviewer Feedback</span>
      </h4>
      <p className="text-sm text-brand-text-secondary whitespace-pre-wrap break-words mb-2">
        {feedbackText}
      </p>
      <div className="pt-2 border-t border-brand-red/10 flex items-center justify-between text-xs">
        <span className="text-brand-text-secondary font-medium" data-testid="inline-comment-count">
          {commentsLabel}
        </span>
        <button
          type="button"
          onClick={onViewFeedback}
          data-testid="view-feedback-button"
          className="text-brand-red font-semibold hover:underline flex items-center gap-1 cursor-pointer"
        >
          View feedback &rarr;
        </button>
      </div>
    </div>
  );
}

function ArticleCard({
  article,
  onDeleteClick,
  onViewFeedbackClick,
  isAdmin,
}: {
  article: ArticleListItem;
  onDeleteClick: (article: ArticleListItem) => void;
  onViewFeedbackClick: (articleId: string) => void;
  isAdmin: boolean;
}): React.JSX.Element {
  const isRejected = article.status === ArticleStatus.Unpublished;
  const displayStatus = isRejected ? ArticleReviewStatus.Rejected : article.status;
  const dateLabel = article.status === ArticleStatus.Published ? 'Published' : 'Last updated';
  const dateValue = article.updatedAt;

  const canEdit = article.status === ArticleStatus.Draft || isRejected;
  const canDelete = article.status === ArticleStatus.Draft || isAdmin;
  const showRejectionBanner = isRejected;

  return (
    <div
      className="flex flex-col gap-0 p-4 bg-brand-surface border border-brand-border rounded"
      data-testid={`article-card-${article.id}`}
    >
      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-brand-text-primary truncate">
            {article.title}
          </p>
          <div className="mt-1 flex items-center gap-2 text-xs text-brand-text-secondary">
            <StatusBadge status={displayStatus as import('@/lib/api/articles').ArticleStatus} />
            <span>
              {dateLabel}: {formatDate(dateValue)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {canEdit ? (
            <Link
              href={`/editor/${article.id}`}
              aria-label="Edit article"
              data-testid={`edit-article-${article.id}`}
              className="p-2 rounded border border-brand-border text-brand-text-secondary hover:text-brand-text-primary hover:border-brand-text-primary transition-colors"
            >
              <Pencil className="w-4 h-4" />
            </Link>
          ) : (
            <button
              type="button"
              disabled
              aria-label="Edit article"
              data-testid={`edit-article-${article.id}`}
              className="p-2 rounded border border-brand-border text-brand-text-secondary opacity-50 cursor-not-allowed"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
          {canDelete ? (
            <button
              type="button"
              onClick={() => onDeleteClick(article)}
              aria-label="Delete article"
              data-testid={`delete-article-${article.id}`}
              className="p-2 rounded border border-brand-border text-brand-text-secondary hover:text-brand-red hover:border-brand-red transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled
              aria-label="Delete article"
              data-testid={`delete-article-${article.id}`}
              className="p-2 rounded border border-brand-border text-brand-text-secondary opacity-50 cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      {showRejectionBanner ? (
        <RejectionFeedback
          feedback={article.rejectionFeedback}
          inlineCommentCount={article.inlineCommentCount ?? 0}
          onViewFeedback={() => onViewFeedbackClick(article.id)}
        />
      ) : null}
    </div>
  );
}

export function MyArticlesList(): React.JSX.Element {
  const { user } = useUser();
  const isAdmin = user?.role === 'Admin';

  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('newest');

  const [articleToDelete, setArticleToDelete] = useState<ArticleListItem | null>(null);
  const [activeFeedbackArticleId, setActiveFeedbackArticleId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast, showToast } = useToast();

  const handleDeleteConfirm = async () => {
    if (!articleToDelete) return;
    setIsDeleting(true);
    try {
      await deleteArticle(articleToDelete.id, isAdmin);
      setArticles((prev) => prev.filter((a) => a.id !== articleToDelete.id));
      showToast('Article deleted successfully', 'success');
      setArticleToDelete(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchMyArticles();
        if (!cancelled) {
          setArticles(result.articles);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleArticles = useMemo(() => {
    const filtered = articles.filter((article) =>
      article.title.toLowerCase().includes(search.trim().toLowerCase())
    );

    const sorted = [...filtered].sort((a, b) => {
      if (sort === 'title') return a.title.localeCompare(b.title);
      const aTime = new Date(a.updatedAt).getTime();
      const bTime = new Date(b.updatedAt).getTime();
      return sort === 'newest' ? bTime - aTime : aTime - bTime;
    });

    return sorted;
  }, [articles, search, sort]);

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center text-brand-text-secondary">
        Loading your articles...
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="p-4 bg-brand-red/10 border border-brand-red/20 rounded text-brand-red text-sm"
        data-testid="my-articles-error"
      >
        {error}
      </div>
    );
  }

  const hasNoVisibleArticles = visibleArticles.length === 0;
  const hasNoArticlesAtAll = articles.length === 0;
  const isDeleteModalOpen = Boolean(articleToDelete);
  const isFeedbackModalOpen = Boolean(activeFeedbackArticleId);

  return (
    <div data-testid="my-articles-list">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-secondary" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your articles..."
              data-testid="article-search-input"
              className={cn(
                'w-full pl-9 pr-3 py-2',
                'bg-brand-bg border border-brand-border rounded',
                'text-sm text-brand-text-primary',
                'focus:outline-none focus:border-brand-red transition-colors'
              )}
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            data-testid="article-sort-select"
            className={cn(
              'px-3 py-2',
              'bg-brand-bg border border-brand-border rounded',
              'text-sm text-brand-text-primary',
              'focus:outline-none focus:border-brand-red transition-colors'
            )}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="title">Title (A–Z)</option>
          </select>
        </div>
        <Link
          href="/editor"
          className="flex items-center justify-center gap-2 bg-brand-red hover:bg-brand-red-hover text-white px-4 py-2 rounded text-sm font-medium transition-colors w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          Create New Article
        </Link>
      </div>

      {hasNoVisibleArticles ? (
        <div
          className="py-16 text-center text-brand-text-secondary text-sm flex flex-col items-center justify-center gap-4"
          data-testid="my-articles-empty"
        >
          {hasNoArticlesAtAll ? (
            <>
              <p>You haven&apos;t written any articles yet.</p>
              <Link
                href="/editor"
                className="flex items-center gap-2 bg-brand-red hover:bg-brand-red-hover text-white px-4 py-2 rounded text-sm font-medium transition-colors mt-2"
              >
                <Plus className="w-4 h-4" />
                Create your first article
              </Link>
            </>
          ) : (
            <p>No articles match your search.</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visibleArticles.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              onDeleteClick={setArticleToDelete}
              onViewFeedbackClick={setActiveFeedbackArticleId}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        title={isAdmin ? 'Permanently Delete Article' : 'Delete Draft'}
        message={
          isAdmin
            ? 'Are you sure you want to permanently delete this article? This action cannot be undone.'
            : 'Are you sure you want to delete this draft? This action cannot be undone.'
        }
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setArticleToDelete(null)}
        isConfirming={isDeleting}
      />

      <ReviewFeedbackModal
        isOpen={isFeedbackModalOpen}
        articleId={activeFeedbackArticleId}
        onClose={() => setActiveFeedbackArticleId(null)}
      />

      <Toast visible={toast.visible} message={toast.message} type={toast.type} />
    </div>
  );
}
