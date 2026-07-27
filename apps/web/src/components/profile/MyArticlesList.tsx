'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Search, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { fetchMyArticles, deleteArticle, type ArticleListItem } from '@/lib/api/articles';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ConfirmationModal } from '@/components/shared/ConfirmationModal';
import { Toast } from '@/components/shared/Toast';
import { useUser } from '@/lib/hooks/useUser';
import { useToast } from '@/lib/hooks/useToast';
import { formatDate } from '@/lib/utils/date';

type SortOption = 'newest' | 'oldest' | 'title';

function ArticleCard({ article, onDeleteClick, isAdmin }: { article: ArticleListItem; onDeleteClick: (article: ArticleListItem) => void; isAdmin: boolean }): React.JSX.Element {
  const dateLabel = article.status === 'Published' ? 'Published' : 'Last updated';
  const dateValue = article.status === 'Published' ? article.updatedAt : article.createdAt;
  const canEdit = article.status === 'Draft' || article.status === 'Rejected';
  const canDelete = article.status === 'Draft' || isAdmin;

  return (
    <div
      className="flex items-center gap-4 p-4 bg-brand-surface border border-brand-border rounded"
      data-testid={`article-card-${article.id}`}
    >
      <div className="w-16 h-16 rounded bg-brand-bg border border-brand-border flex-shrink-0 flex items-center justify-center text-brand-text-secondary text-xs">
        No image
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-medium text-brand-text-primary truncate">
          {article.title}
        </p>
        <div className="mt-1 flex items-center gap-2 text-xs text-brand-text-secondary">
          <StatusBadge status={article.status} />
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
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast, showToast } = useToast();

  const handleDeleteConfirm = async () => {
    if (!articleToDelete) return;
    setIsDeleting(true);
    try {
      await deleteArticle(articleToDelete.id, isAdmin);
      setArticles(prev => prev.filter(a => a.id !== articleToDelete.id));
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
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
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

  return (
    <div data-testid="my-articles-list">
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-secondary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your articles..."
            data-testid="article-search-input"
            className="w-full pl-9 pr-3 py-2 bg-brand-bg border border-brand-border rounded text-sm text-brand-text-primary focus:outline-none focus:border-brand-red transition-colors"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          data-testid="article-sort-select"
          className="px-3 py-2 bg-brand-bg border border-brand-border rounded text-sm text-brand-text-primary focus:outline-none focus:border-brand-red transition-colors"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="title">Title (A–Z)</option>
        </select>
      </div>

      {visibleArticles.length === 0 ? (
        <div
          className="py-16 text-center text-brand-text-secondary text-sm"
          data-testid="my-articles-empty"
        >
          {articles.length === 0
            ? "You haven't written any articles yet."
            : 'No articles match your search.'}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visibleArticles.map((article) => (
            <ArticleCard key={article.id} article={article} onDeleteClick={setArticleToDelete} isAdmin={isAdmin} />
          ))}
        </div>
      )}

      <ConfirmationModal
        isOpen={!!articleToDelete}
        title={isAdmin ? "Permanently Delete Article" : "Delete Draft"}
        message={isAdmin 
          ? "Are you sure you want to permanently delete this article? This action cannot be undone."
          : "Are you sure you want to delete this draft? This action cannot be undone."}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setArticleToDelete(null)}
        isConfirming={isDeleting}
      />

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
      />
    </div>
  );
}
