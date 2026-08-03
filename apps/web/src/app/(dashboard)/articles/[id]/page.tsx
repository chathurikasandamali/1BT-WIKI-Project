'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getArticle, ArticleDetail } from '@/lib/api/articles';
import { UserAvatar } from '@/components/UserAvatar';
import { ArticleContent } from '@/components/article-detail/ArticleContent';
import { LikeButton } from '@/components/article-detail/LikeButton';
import { CommentsSection } from '@/components/article-detail/CommentsSection';
import { ArrowLeftIcon } from '@/components/shared/icons/ArrowLeftIcon';

interface ArticlePageProps {
  params: Promise<{ id: string }>;
}

export default function ArticleDetailPage(props: ArticlePageProps) {
  // In Next.js 15+, params is a Promise. We need to unwrap it in a Client Component.
  const params = React.use(props.params);
  
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadArticle() {
      try {
        setLoading(true);
        const data = await getArticle(params.id);
        if (mounted) {
          setArticle(data);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load article');
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
  }, [params.id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center text-brand-text-secondary" data-testid="loading-skeleton">
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
        <p className="text-brand-red font-medium mb-4">{error || 'Article not found'}</p>
        <Link
          href="/articles"
          className="inline-flex items-center text-sm font-medium text-brand-text-secondary hover:text-brand-red transition-colors"
        >
          <ArrowLeftIcon width="16" height="16" className="mr-1" />
          Back to Articles
        </Link>
      </div>
    );
  }

  const formattedDate = new Date(article.createdAt).toLocaleDateString(
    'en-US',
    {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }
  );


  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
      <div className="mb-6">
        <Link
          href="/articles"
          className="inline-flex items-center text-sm font-medium text-brand-text-secondary hover:text-brand-red transition-colors"
        >
          <ArrowLeftIcon width="16" height="16" className="mr-1" />
          Back to Articles
        </Link>
      </div>

      <article className="bg-brand-surface rounded-xl shadow-sm border border-brand-border overflow-hidden">
        <div className="p-8 md:p-12 pb-6 border-b border-brand-border">
          <div className="flex flex-wrap gap-2 mb-6">
            {article.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 rounded-full bg-brand-bg text-brand-text-secondary text-xs font-semibold uppercase tracking-wider"
              >
                {tag}
              </span>
            ))}
          </div>

          <h1 className="text-4xl md:text-5xl font-display font-bold text-brand-dark leading-tight mb-8">
            {article.title}
          </h1>

          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <UserAvatar
                format="detail"
                name={article.authorName}
                avatarUrl={article.authorImage}
              />
              <div>
                <p className="font-semibold text-brand-dark">
                  {article.authorName || 'Unknown Author'}
                </p>
                <p className="text-sm text-brand-text-secondary">
                  {formattedDate}
                </p>
              </div>
            </div>
            <LikeButton
              articleId={article.id}
              initialLikeCount={article.likeCount}
              initialLikedByMe={article.likedByMe}
            />
          </div>
        </div>

        <div className="p-8 md:p-12 bg-white">
          <ArticleContent body={article.body} />
        </div>
      </article>

      <CommentsSection articleId={params.id} />
    </div>
  );
}
