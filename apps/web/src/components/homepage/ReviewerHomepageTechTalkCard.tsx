'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { type TechTalkListItem } from '@/lib/api/techTalks';
import { formatDate } from '@/lib/utils/date';
import { isValidYoutubeVideoId } from '@/lib/utils/youtube';
import { cn } from '@/lib/utils';

interface ReviewerHomepageTechTalkCardProps {
  techTalk: TechTalkListItem;
}

const MAX_VISIBLE_TAGS = 3;

/**
 * Reviewer Home Tech Talk card. Thumbnails render only when a YouTube video ID exists.
 */
export function ReviewerHomepageTechTalkCard({
  techTalk,
}: ReviewerHomepageTechTalkCardProps): React.JSX.Element {
  const [imageFailed, setImageFailed] = React.useState(false);
  const thumbnailUrl = isValidYoutubeVideoId(techTalk.youtubeVideoId)
    ? `https://i.ytimg.com/vi/${techTalk.youtubeVideoId}/hqdefault.jpg`
    : null;
  const showImage = Boolean(thumbnailUrl) && !imageFailed;
  const visibleTags = techTalk.tags.slice(0, MAX_VISIBLE_TAGS);
  const remainingTagCount = techTalk.tags.length - visibleTags.length;
  const presenterLabel = techTalk.presenters.join(', ');

  return (
    <article
      className={cn(
        'group overflow-hidden rounded-2xl border border-brand-border bg-brand-surface shadow-sm',
        'transition-[border-color,box-shadow] duration-200 hover:border-brand-dark/20 hover:shadow-lg'
      )}
    >
      <Link
        href={`/tech-talks/${techTalk.id}`}
        data-testid={`techtalk-card-${techTalk.id}`}
        className={cn(
          'flex min-w-0 flex-col sm:flex-row',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-red'
        )}
      >
        {showImage && thumbnailUrl && (
          <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-brand-bg sm:aspect-auto sm:w-56 lg:w-64">
            <Image
              src={thumbnailUrl}
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
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700">
              Tech Talk
            </span>
            <time
              dateTime={techTalk.eventDate}
              className="text-xs text-brand-text-secondary"
            >
              {formatDate(techTalk.eventDate)}
            </time>
          </div>

          <h3 className="line-clamp-2 font-display text-lg font-bold leading-snug tracking-[-0.025em] text-brand-text-primary sm:text-xl">
            {techTalk.title}
          </h3>

          {techTalk.description && (
            <p className="line-clamp-2 text-sm leading-6 text-brand-text-secondary">
              {techTalk.description}
            </p>
          )}

          {techTalk.presenters.length > 0 && (
            <p className="min-w-0 break-words text-sm text-brand-text-secondary">
              Presented by{' '}
              <span className="font-semibold text-brand-text-primary">
                {presenterLabel}
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
        </div>
      </Link>
    </article>
  );
}
