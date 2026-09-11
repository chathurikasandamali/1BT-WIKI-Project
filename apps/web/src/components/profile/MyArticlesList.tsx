'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  fetchMyArticles,
  deleteArticle,
  type ArticleListItem,
  type ArticleStatus,
} from '@/lib/api/articles';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ConfirmationModal } from '@/components/shared/ConfirmationModal';
import { ReviewFeedbackModal } from '@/components/articles/ReviewFeedbackModal';
import { Toast } from '@/components/shared/Toast';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageLoader } from '@/components/shared/PageLoader';
import { DashboardWidget } from '@/components/admin/DashboardWidget';
import { FilterChip } from '@/components/admin/FilterChip';
import { useUser } from '@/lib/hooks/useUser';
import { UserRoleValue } from '@repo/shared';
import { useToast } from '@/lib/hooks/useToast';
import { formatDate } from '@/lib/utils/date';
import { ArticleIcon } from '@/components/shared/icons/ArticleIcon';
import { FileIcon } from '@/components/shared/icons/FileIcon';
import { SearchIcon } from '@/components/shared/icons/SearchIcon';
import { EditIcon } from '@/components/shared/icons/EditIcon';
import { TrashIcon } from '@/components/shared/icons/TrashIcon';
import { CheckCircleIcon } from '@/components/shared/icons/CheckCircleIcon';

type SortOption = 'newest' | 'oldest' | 'title';
type ArticleViewFilter =
  | 'All'
  | 'Articles'
  | 'Drafts'
  | 'Pending'
  | 'Published'
  | 'Approved'
  | 'Unpublished';

const VIEW_FILTERS: ArticleViewFilter[] = [
  'All',
  'Articles',
  'Drafts',
  'Pending',
  'Published',
  'Approved',
  'Unpublished',
];

const FILTER_LABELS: Record<ArticleViewFilter, string> = {
  All: 'All',
  Articles: 'Articles',
  Drafts: 'Drafts',
  Pending: 'Pending',
  Published: 'Published',
  Approved: 'Approved',
  Unpublished: 'Rejected',
};

const INITIAL_VISIBLE_COUNT = 5;
const VISIBLE_STEP = 5;

/**
 * Returns true when the article is still a private draft.
 */
function isDraftArticle(article: ArticleListItem): boolean {
  return article.status === 'Draft';
}

/**
 * Applies the My Articles view filter to a single article.
 */
function matchesViewFilter(
  article: ArticleListItem,
  filter: ArticleViewFilter
): boolean {
  if (filter === 'All') {
    return true;
  }
  if (filter === 'Drafts') {
    return isDraftArticle(article);
  }
  if (filter === 'Articles') {
    return !isDraftArticle(article);
  }
  return article.status === filter;
}

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
  const feedbackText = trimmedFeedback
    ? trimmedFeedback
    : 'No reviewer feedback was provided.';
  const commentsLabel = `${inlineCommentCount} inline comment${inlineCommentCount === 1 ? '' : 's'}`;

  return (
    <div
      className="mt-3 rounded border border-brand-red/10 bg-brand-red/5 p-3"
      data-testid="reviewer-feedback-banner"
    >
      <h4 className="mb-1 text-xs font-semibold text-brand-red">Reviewer Feedback</h4>
      <p className="whitespace-pre-wrap break-words text-sm text-brand-text-secondary">
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
  onViewFeedback,
  isAdmin,
}: {
  article: ArticleListItem;
  onDeleteClick: (article: ArticleListItem) => void;
  onViewFeedback: (articleId: string) => void;
  isAdmin: boolean;
}): React.JSX.Element {
  const isRejected = article.status === 'Unpublished';
  const displayStatus: ArticleStatus = isRejected ? 'Rejected' : article.status;
  const dateLabel = article.status === 'Published' ? 'Published' : 'Last updated';
  const dateValue = article.updatedAt;
  const canEdit = article.status === 'Draft' || isRejected;
  const canDelete = article.status === 'Draft' || isAdmin;

  let editControl: React.JSX.Element;
  if (canEdit) {
    editControl = (
      <Link
        href={`/editor/${article.id}`}
        aria-label="Edit article"
        data-testid={`edit-article-${article.id}`}
        className="rounded border border-brand-border p-2 text-brand-text-secondary transition-colors hover:border-brand-text-primary hover:text-brand-text-primary"
      >
        <EditIcon className="h-4 w-4" />
      </Link>
    );
  } else {
    editControl = (
      <button
        type="button"
        disabled
        aria-label="Edit article"
        data-testid={`edit-article-${article.id}`}
        className="cursor-not-allowed rounded border border-brand-border p-2 text-brand-text-secondary opacity-50"
      >
        <EditIcon className="h-4 w-4" />
      </button>
    );
  }

  let deleteControl: React.JSX.Element;
  if (canDelete) {
    deleteControl = (
      <button
        type="button"
        onClick={() => onDeleteClick(article)}
        aria-label="Delete article"
        data-testid={`delete-article-${article.id}`}
        className="rounded border border-brand-border p-2 text-brand-text-secondary transition-colors hover:border-brand-red hover:text-brand-red"
      >
        <TrashIcon className="h-4 w-4" />
      </button>
    );
  } else {
    deleteControl = (
      <button
        type="button"
        disabled
        aria-label="Delete article"
        data-testid={`delete-article-${article.id}`}
        className="cursor-not-allowed rounded border border-brand-border p-2 text-brand-text-secondary opacity-50"
      >
        <TrashIcon className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div
      className="flex flex-col gap-0 rounded border border-brand-border bg-brand-surface p-4 shadow-sm"
      data-testid={`article-card-${article.id}`}
    >
      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-brand-text-primary">{article.title}</p>
          <div className="mt-1 flex items-center gap-2 text-xs text-brand-text-secondary">
            <StatusBadge status={displayStatus} />
            <span>
              {dateLabel}: {formatDate(dateValue)}
            </span>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          {editControl}
          {deleteControl}
        </div>
      </div>
      {isRejected && (
        <RejectionFeedback
          feedback={article.rejectionFeedback}
          inlineCommentCount={article.inlineCommentCount}
          onViewFeedback={() => onViewFeedback(article.id)}
        />
      )}
    </div>
  );
}

/**
 * Text control that reveals the next page of cards in a My Articles section.
 */
function ShowMoreButton({
  remaining,
  onClick,
  testId,
}: {
  remaining: number;
  onClick: () => void;
  testId: string;
}): React.JSX.Element {
  return (
    <div className="flex justify-center pt-1">
      <button
        type="button"
        onClick={onClick}
        data-testid={testId}
        className="text-sm font-medium text-brand-red transition-colors hover:text-brand-red-hover"
      >
        Show more
        <span className="ml-1 text-xs font-normal text-brand-text-secondary">
          ({remaining} more)
        </span>
      </button>
    </div>
  );
}

/**
 * Lists the signed-in user's submitted articles and drafts in separate sections.
 */
export function MyArticlesList(): React.JSX.Element {
  const { user } = useUser();
  const isAdmin = user?.role === UserRoleValue.Admin;
  
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('newest');
  const [viewFilter, setViewFilter] = useState<ArticleViewFilter>('All');
  const [submittedVisibleCount, setSubmittedVisibleCount] =
    useState(INITIAL_VISIBLE_COUNT);
  const [draftVisibleCount, setDraftVisibleCount] = useState(INITIAL_VISIBLE_COUNT);

  const [articleToDelete, setArticleToDelete] = useState<ArticleListItem | null>(null);
  const [activeFeedbackArticleId, setActiveFeedbackArticleId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast, showToast } = useToast();

  const handleDeleteConfirm = async () => {
    if (!articleToDelete) return;
    setIsDeleting(true);
    try {
      await deleteArticle(articleToDelete.id, isAdmin);
      setArticles((prev: ArticleListItem[]): ArticleListItem[] =>
        prev.filter((article: ArticleListItem): boolean => article.id !== articleToDelete.id)
      );
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

  useEffect(() => {
    setSubmittedVisibleCount(INITIAL_VISIBLE_COUNT);
    setDraftVisibleCount(INITIAL_VISIBLE_COUNT);
  }, [search, sort, viewFilter]);

  const visibleArticles = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = articles.filter((article: ArticleListItem): boolean => {
      const matchesSearch = article.title.toLowerCase().includes(query);
      return matchesSearch && matchesViewFilter(article, viewFilter);
    });

    return [...filtered].sort((a: ArticleListItem, b: ArticleListItem): number => {
      if (sort === 'title') return a.title.localeCompare(b.title);
      const aTime = new Date(a.updatedAt).getTime();
      const bTime = new Date(b.updatedAt).getTime();
      return sort === 'newest' ? bTime - aTime : aTime - bTime;
    });
  }, [articles, search, sort, viewFilter]);

  const submittedArticles = visibleArticles.filter(
    (article: ArticleListItem): boolean => !isDraftArticle(article)
  );
  const draftArticles = visibleArticles.filter((article: ArticleListItem): boolean =>
    isDraftArticle(article)
  );
  const visibleSubmittedArticles = submittedArticles.slice(0, submittedVisibleCount);
  const visibleDraftArticles = draftArticles.slice(0, draftVisibleCount);
  const remainingSubmitted = submittedArticles.length - visibleSubmittedArticles.length;
  const remainingDrafts = draftArticles.length - visibleDraftArticles.length;
  const totalSubmitted = articles.filter(
    (article: ArticleListItem): boolean => !isDraftArticle(article)
  ).length;
  const totalDrafts = articles.filter((article: ArticleListItem): boolean =>
    isDraftArticle(article)
  ).length;

  const showSubmittedSection =
    viewFilter === 'All' ||
    viewFilter === 'Articles' ||
    viewFilter === 'Pending' ||
    viewFilter === 'Published' ||
    viewFilter === 'Approved' ||
    viewFilter === 'Unpublished';
  const showDraftsSection = viewFilter === 'All' || viewFilter === 'Drafts';

  if (loading) {
    return (
      <PageLoader
        testId="my-articles-loading"
        message="Loading your articles"
        className="min-h-0 py-16"
      />
    );
  }

  if (error) {
    return (
      <div
        className="rounded border border-brand-red/20 bg-brand-red/10 p-4 text-sm text-brand-red"
        data-testid="my-articles-error"
      >
        {error}
      </div>
    );
  }

  const hasNoArticles = articles.length === 0;
  const hasNoMatches = !hasNoArticles && visibleArticles.length === 0;
  const showGlobalEmpty = hasNoArticles || hasNoMatches;

  let emptyTitle = "You haven't written any articles yet.";
  let emptyDescription =
    'Use Create New Article when you are ready to start a draft.';
  if (hasNoMatches) {
    emptyTitle = 'No articles match your search.';
    emptyDescription = 'Try a different title or clear the filters to see your work again.';
  }

  return (
    <div data-testid="my-articles-list">
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DashboardWidget
          label="Total"
          description="Everything you have written"
          value={articles.length}
          onClick={() => setViewFilter('All')}
          selected={viewFilter === 'All'}
          icon={<ArticleIcon className="h-4 w-4" />}
          borderClassName="border-brand-border"
          testId="widget-my-articles-total"
        />
        <DashboardWidget
          label="Articles"
          description="Submitted, published, or in review"
          value={totalSubmitted}
          onClick={() => setViewFilter('Articles')}
          selected={viewFilter === 'Articles'}
          icon={<CheckCircleIcon className="h-4 w-4" />}
          valueClassName="text-green-600"
          iconClassName="bg-green-50 text-green-700"
          borderClassName="border-green-200"
          testId="widget-my-articles-submitted"
        />
        <DashboardWidget
          label="Drafts"
          description="Private drafts only you can see"
          value={totalDrafts}
          onClick={() => setViewFilter('Drafts')}
          selected={viewFilter === 'Drafts'}
          icon={<FileIcon className="h-4 w-4" />}
          valueClassName="text-amber-600"
          iconClassName="bg-amber-50 text-amber-700"
          borderClassName="border-amber-200"
          testId="widget-my-articles-drafts"
        />
      </div>

      <section className="overflow-visible rounded border border-brand-border bg-brand-surface shadow-sm">
        <div className="border-b border-brand-border bg-brand-bg/40 px-4 py-4">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-brand-text-primary">Your work</h2>
            <p className="mt-0.5 text-xs text-brand-text-secondary">
              Search by title, filter by status, and open a draft when you are ready to keep writing.
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                <SearchIcon className="h-4 w-4 text-brand-text-secondary" />
              </span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search your articles..."
                data-testid="article-search-input"
                className="w-full rounded border border-brand-border bg-brand-surface py-2.5 pl-9 pr-3 text-sm text-brand-text-primary transition-colors placeholder:text-brand-text-secondary focus:border-brand-red focus:outline-none"
              />
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              data-testid="article-sort-select"
              className="rounded border border-brand-border bg-brand-surface px-3 py-2.5 text-sm text-brand-text-primary transition-colors focus:border-brand-red focus:outline-none"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="title">Title (A–Z)</option>
            </select>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {VIEW_FILTERS.map((filter) => (
              <FilterChip
                key={filter}
                label={FILTER_LABELS[filter]}
                selected={viewFilter === filter}
                onClick={() => setViewFilter(filter)}
              />
            ))}
          </div>
        </div>

        {showGlobalEmpty && (
          <EmptyState
            testId="my-articles-empty"
            title={emptyTitle}
            description={emptyDescription}
            icon={<ArticleIcon className="h-6 w-6" />}
          />
        )}

        {!showGlobalEmpty && (
          <div className="flex flex-col gap-8 p-4">
            {showSubmittedSection &&
              (submittedArticles.length > 0 || search.trim() === '') && (
              <section data-testid="my-articles-articles-section">
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-brand-text-primary">Articles</h3>
                  <p className="mt-0.5 text-xs text-brand-text-secondary">
                    Submitted work that is pending, approved, published, or rejected.
                  </p>
                </div>
                {submittedArticles.length === 0 && (
                  <div className="rounded border border-dashed border-brand-border bg-brand-bg/40">
                    <EmptyState
                      title="No articles here yet"
                      description="Submitted articles will appear in this section once you send a draft for review."
                      icon={<ArticleIcon className="h-6 w-6" />}
                    />
                  </div>
                )}
                {submittedArticles.length > 0 && (
                  <div className="flex flex-col gap-3">
                    {visibleSubmittedArticles.map((article: ArticleListItem) => (
                      <ArticleCard
                        key={article.id}
                        article={article}
                        onDeleteClick={setArticleToDelete}
                        onViewFeedback={setActiveFeedbackArticleId}
                        isAdmin={isAdmin}
                      />
                    ))}
                    {remainingSubmitted > 0 && (
                      <ShowMoreButton
                        remaining={remainingSubmitted}
                        testId="show-more-articles"
                        onClick={() =>
                          setSubmittedVisibleCount((count: number): number => count + VISIBLE_STEP)
                        }
                      />
                    )}
                  </div>
                )}
              </section>
            )}

            {showDraftsSection &&
              (draftArticles.length > 0 || search.trim() === '') && (
              <section data-testid="my-articles-drafts-section">
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-brand-text-primary">Drafts</h3>
                  <p className="mt-0.5 text-xs text-brand-text-secondary">
                    Private drafts you can keep editing until you are ready to submit.
                  </p>
                </div>
                {draftArticles.length === 0 && (
                  <div className="rounded border border-dashed border-brand-border bg-brand-bg/40">
                    <EmptyState
                      title="No drafts yet"
                      description="Start a draft from Create New Article. It will stay here until you submit it."
                      icon={<FileIcon className="h-6 w-6" />}
                    />
                  </div>
                )}
                {draftArticles.length > 0 && (
                  <div className="flex flex-col gap-3">
                    {visibleDraftArticles.map((article: ArticleListItem) => (
                      <ArticleCard
                        key={article.id}
                        article={article}
                        onDeleteClick={setArticleToDelete}
                        onViewFeedback={setActiveFeedbackArticleId}
                        isAdmin={isAdmin}
                      />
                    ))}
                    {remainingDrafts > 0 && (
                      <ShowMoreButton
                        remaining={remainingDrafts}
                        testId="show-more-drafts"
                        onClick={() =>
                          setDraftVisibleCount((count: number): number => count + VISIBLE_STEP)
                        }
                      />
                    )}
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </section>

      <ConfirmationModal
        isOpen={!!articleToDelete}
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
        isOpen={activeFeedbackArticleId !== null}
        articleId={activeFeedbackArticleId}
        onClose={() => setActiveFeedbackArticleId(null)}
      />

      <Toast visible={toast.visible} message={toast.message} type={toast.type} />
    </div>
  );
}
