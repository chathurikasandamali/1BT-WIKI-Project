'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CommentIcon } from '@/components/shared/icons/CommentIcon';
import { EyeIcon } from '@/components/shared/icons/EyeIcon';
import { HeartIcon } from '@/components/shared/icons/HeartIcon';
import { formatDate } from '@/lib/utils/date';
import { cn } from '@/lib/utils';

interface ReviewerHomepageArticleCardProps {
  id: string;
  title: string;
  tags: string[];
  likeCount: number;
  commentCount: number;
  views: number;
  createdAt: string;
  authorName?: string;
  coverImageUrl: string | null;
}

const MAX_VISIBLE_TAGS = 3;

/**
 * Reviewer Home article card. Cover images render only when the article has one.
 */
export function ReviewerHomepageArticleCard({
  id,
  title,
  tags,
  likeCount,
  commentCount,
  views,
  createdAt,
  authorName,
  coverImageUrl,
}: ReviewerHomepageArticleCardProps): React.JSX.Element {
  const [imageFailed, setImageFailed] = React.useState(false);
  const showImage = Boolean(coverImageUrl) && !imageFailed;
  const visibleTags = tags.slice(0, MAX_VISIBLE_TAGS);
  const remainingTagCount = tags.length - visibleTags.length;

  return (
    <article
      className={cn(
        'group overflow-hidden rounded-2xl border border-brand-border bg-brand-surface shadow-sm',
        'transition-[border-color,box-shadow] duration-200 hover:border-brand-dark/20 hover:shadow-lg'
      )}
    >
      <Link
        href={`/articles/${id}`}
        data-testid={`article-card-${id}`}
        className={cn(
          'flex min-w-0 flex-col sm:flex-row',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-red'
        )}
      >
        {showImage && coverImageUrl && (
          <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-brand-bg sm:aspect-auto sm:w-56 lg:w-64">
            <Image
              src={coverImageUrl}
              alt=""
              fill
              unoptimized
              onError={() => setImageFailed(true)}
              sizes="(min-width: 1024px) 16rem, (min-width: 640px) 14rem, 100vw"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transform-none"
            />
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-3 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-brand-red px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
              Article
            </span>
            <time
              dateTime={createdAt}
              className="text-xs text-brand-text-secondary"
            >
              {formatDate(createdAt)}
            </time>
          </div>

          <h3 className="line-clamp-2 font-display text-lg font-bold leading-snug tracking-[-0.025em] text-brand-text-primary sm:text-xl">
            {title}
          </h3>

          {authorName && (
            <p className="text-sm text-brand-text-secondary">
              By{' '}
              <span className="font-medium text-brand-text-primary">
                {authorName}
              </span>
            </p>
          )}

          {visibleTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {visibleTags.map((tag) => (
                <span
                  key={tag}
                  className="max-w-full truncate rounded-full border border-brand-border bg-brand-hover px-2.5 py-1 text-xs font-medium text-brand-text-secondary"
                >
                  {tag}
                </span>
              ))}
              {remainingTagCount > 0 && (
                <span className="rounded-full border border-brand-border bg-brand-surface px-2.5 py-1 text-xs font-semibold text-brand-text-secondary">
                  +{remainingTagCount}
                </span>
              )}
            </div>
          )}

          <div className="mt-auto flex flex-wrap items-center gap-4 pt-1 text-sm text-brand-text-secondary">
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
      </Link>
    </article>
  );
}
