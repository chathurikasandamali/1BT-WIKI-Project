import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArticleIcon } from '@/components/shared/icons/ArticleIcon';
import { HeartIcon } from '@/components/shared/icons/HeartIcon';
import { CommentIcon } from '@/components/shared/icons/CommentIcon';
import { EyeIcon } from '@/components/shared/icons/EyeIcon';

interface ArticleCardProps {
  id: string;
  title: string;
  tags: string[];
  likeCount: number;
  commentCount: number;
  views: number;
  createdAt: string;
  coverImageUrl?: string | null;
}

export function ArticleCard({
  id,
  title,
  tags,
  likeCount,
  commentCount,
  views,
  createdAt,
  coverImageUrl,
}: ArticleCardProps): React.JSX.Element {
  const [thumbnailLoadFailed, setThumbnailLoadFailed] = React.useState(false);

  function handleThumbnailError(): void {
    setThumbnailLoadFailed(true);
  }

  const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const showThumbnail = coverImageUrl !== undefined;

  return (
    <Link
      href={`/articles/${id}`}
      data-testid={`article-card-${id}`}
      className="flex flex-col gap-4 bg-white border border-brand-border rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-200"
    >
      {showThumbnail && (
        <div className="relative aspect-video w-full overflow-hidden bg-brand-dark">
          {coverImageUrl && !thumbnailLoadFailed ? (
            <Image
              src={coverImageUrl}
              alt={`${title} article thumbnail`}
              fill
              unoptimized
              onError={handleThumbnailError}
              sizes="(min-width: 1280px) 22vw, (min-width: 1024px) 30vw, (min-width: 768px) 45vw, 100vw"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-brand-dark px-6 text-white">
              <div
                className="absolute -right-12 -top-12 h-36 w-36 rounded-full border-[24px] border-brand-red/25"
                aria-hidden="true"
              />
              <div className="relative flex flex-col items-center gap-2 text-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-brand-red">
                  <ArticleIcon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-display text-sm font-bold tracking-[-0.02em]">
                    1BT-WIKI
                  </p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">
                    Article
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      <div className="flex flex-col gap-2 flex-grow px-6 pt-6">
        <h2 className="text-xl font-semibold text-brand-text-primary line-clamp-2">
          {title}
        </h2>
        <div className="flex flex-wrap gap-2 mt-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between px-6 pb-6 text-sm text-brand-text-secondary">
        <div className="flex items-center gap-4">
          <div
            className="flex items-center gap-1"
            data-testid="article-like-count"
          >
            <HeartIcon width="16" height="16" />
            <span>{likeCount}</span>
          </div>
          <div
            className="flex items-center gap-1"
            data-testid="article-comment-count"
          >
            <CommentIcon width="16" height="16" />
            <span>{commentCount}</span>
          </div>
          <div
            className="flex items-center gap-1"
            data-testid="article-view-count"
          >
            <EyeIcon width="16" height="16" />
            <span>{views}</span>
          </div>
        </div>
        <span>{formattedDate}</span>
      </div>
    </Link>
  );
}
