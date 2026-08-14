import React from 'react';
import Link from 'next/link';
import { ArticleIcon } from '@/components/shared/icons/ArticleIcon';
import { CommentIcon } from '@/components/shared/icons/CommentIcon';
import { EyeIcon } from '@/components/shared/icons/EyeIcon';
import { HeartIcon } from '@/components/shared/icons/HeartIcon';

interface UserHomepageArticleCardProps {
  id: string;
  title: string;
  tags: string[];
  likeCount: number;
  commentCount: number;
  views: number;
  createdAt: string;
  coverImageUrl: string | null;
}

const MAX_VISIBLE_TAGS = 3;

export function UserHomepageArticleCard({
  id,
  title,
  tags,
  likeCount,
  commentCount,
  views,
  createdAt,
  coverImageUrl,
}: UserHomepageArticleCardProps): React.JSX.Element {
  const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const visibleTags = tags.slice(0, MAX_VISIBLE_TAGS);
  const remainingTagCount = tags.length - visibleTags.length;

  return (
    <article className="group overflow-hidden rounded-2xl border border-brand-border bg-brand-surface 
    shadow-sm transition-all duration-200 hover:border-brand-dark/20 hover:shadow-lg">
      <Link
        href={`/articles/${id}`}
        data-testid={`article-card-${id}`}
        className="grid min-w-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 
        focus-visible:outline-brand-red sm:grid-cols-[minmax(14rem,0.85fr)_minmax(0,1.4fr)] 
        lg:grid-cols-[minmax(18rem,0.85fr)_minmax(0,1.5fr)]"
      >
        <div className="relative aspect-video w-full overflow-hidden bg-brand-dark">
          {coverImageUrl ? (
            <img
              src={coverImageUrl}
              alt={`${title} cover`}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-brand-dark px-6 text-white">
              <div className="flex flex-col items-center gap-3 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-white/10">
                  <ArticleIcon className="h-6 w-6" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-display text-lg font-bold tracking-[-0.02em]">
                    1BT-WIKI
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
                    Article
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col p-5 sm:p-6">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-brand-red">
            <ArticleIcon className="h-4 w-4" aria-hidden="true" />
            <span>Article</span>
          </div>

          <h3 className="mt-3 line-clamp-2 font-display text-xl font-bold leading-snug tracking-[-0.025em] 
          text-brand-text-primary sm:text-2xl">
            {title}
          </h3>

          {visibleTags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {visibleTags.map((tag) => (
                <span
                  key={tag}
                  className="max-w-40 truncate rounded-full border border-brand-border bg-brand-hover px-2.5 
                  py-1 text-xs font-medium text-brand-text-secondary"
                >
                  {tag}
                </span>
              ))}
              {remainingTagCount > 0 && (
                <span className="rounded-full border border-brand-border bg-brand-surface px-2.5 py-1 text-xs 
                font-semibold text-brand-text-secondary">
                  +{remainingTagCount}
                </span>
              )}
            </div>
          )}

          <div className="mt-5 flex flex-col gap-3 border-t border-brand-border pt-4 text-sm text-brand-text-secondary 
          sm:mt-auto sm:flex-row sm:items-center sm:justify-between">
            <time dateTime={createdAt}>{formattedDate}</time>
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1.5">
                <HeartIcon width="16" height="16" aria-hidden="true" />
                <span>
                  {likeCount}
                  <span className="sr-only"> likes</span>
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <CommentIcon width="16" height="16" aria-hidden="true" />
                <span>
                  {commentCount}
                  <span className="sr-only"> comments</span>
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <EyeIcon width="16" height="16" aria-hidden="true" />
                <span>
                  {views}
                  <span className="sr-only"> views</span>
                </span>
              </span>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
