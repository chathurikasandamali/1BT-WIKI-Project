import React from 'react';
import Link from 'next/link';
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
}

export function ArticleCard({
  id,
  title,
  tags,
  likeCount,
  commentCount,
  views,
  createdAt,
}: ArticleCardProps): React.JSX.Element {
  const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Link
      href={`/articles/${id}`}
      data-testid={`article-card-${id}`}
      className="flex flex-col gap-4 p-6 bg-white border border-brand-border rounded-lg hover:shadow-md transition-shadow duration-200"
    >
      <div className="flex flex-col gap-2 flex-grow">
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
      <div className="flex items-center justify-between mt-4 text-sm text-brand-text-secondary">
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
