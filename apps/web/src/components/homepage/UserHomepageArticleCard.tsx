'use client';

import React from 'react';
import Image from 'next/image';
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

/**
 * Renders the media-first Article card used only by the normal-User homepage.
 */
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
  const [thumbnailLoadFailed, setThumbnailLoadFailed] = React.useState(false);

  function handleThumbnailError(): void {
    setThumbnailLoadFailed(true);
  }

  const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const visibleTags = tags.slice(0, MAX_VISIBLE_TAGS);
  const remainingTagCount = tags.length - visibleTags.length;

  return (
    <article className="group h-full rounded-2xl border border-brand-border bg-brand-surface shadow-sm
    transition-[border-color,box-shadow] duration-200 hover:border-brand-dark/20 hover:shadow-lg">
      <Link
        href={`/articles/${id}`}
        data-testid={`article-card-${id}`}
        className="flex h-full min-w-0 flex-col rounded-2xl focus-visible:outline focus-visible:outline-2
        focus-visible:outline-offset-4 focus-visible:outline-brand-red"
      >
        <div className="relative aspect-video w-full overflow-hidden rounded-t-2xl bg-brand-dark">
          {coverImageUrl && !thumbnailLoadFailed ? (
            <Image
              src={coverImageUrl}
              alt=""
              fill
              unoptimized
              onError={handleThumbnailError}
              sizes="(min-width: 1280px) 36vw, (min-width: 1024px) 50vw, 100vw"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]
              motion-reduce:transform-none motion-reduce:transition-none"
            />
          ) : (
            <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-brand-dark px-6 text-white" aria-hidden="true">
              <div
                className="absolute -right-12 -top-12 h-36 w-36 rounded-full border-[24px] border-brand-red/25"
                aria-hidden="true"
              />
              <div className="relative flex flex-col items-center gap-3 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-brand-red">
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
          <span className="absolute left-3 top-3 rounded-full bg-brand-red px-3 py-1 text-xs font-bold uppercase
          tracking-[0.14em] text-white shadow-sm" aria-hidden="true">
            Article
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col p-5 sm:p-6">
          <h3 className="line-clamp-2 font-display text-xl font-bold leading-snug tracking-[-0.025em]
          text-brand-text-primary">
            {title}
          </h3>

          {visibleTags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {visibleTags.map((tag) => (
                <span
                  key={tag}
                  className="max-w-full truncate rounded-full border border-brand-border bg-brand-hover px-2.5
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
          sm:flex-row sm:items-center sm:justify-between lg:mt-auto">
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
