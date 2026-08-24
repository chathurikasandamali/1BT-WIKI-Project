'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { TechTalkIcon } from '@/components/shared/icons/TechTalkIcon';
import { type TechTalkListItem } from '@/lib/api/techTalks';
import { formatDate } from '@/lib/utils/date';
import { isValidYoutubeVideoId } from '@/lib/utils/youtube';

interface UserHomepageTechTalkCardProps {
  techTalk: TechTalkListItem;
}

const MAX_VISIBLE_TAGS = 3;

/**
 * Renders the media-first Tech Talk card used only by the normal-User homepage.
 */
export function UserHomepageTechTalkCard({
  techTalk,
}: UserHomepageTechTalkCardProps): React.JSX.Element {
  const [thumbnailLoadFailed, setThumbnailLoadFailed] = React.useState(false);
  const thumbnailUrl = isValidYoutubeVideoId(techTalk.youtubeVideoId)
    ? `https://i.ytimg.com/vi/${techTalk.youtubeVideoId}/hqdefault.jpg`
    : null;
  const visibleTags = techTalk.tags.slice(0, MAX_VISIBLE_TAGS);
  const remainingTagCount = techTalk.tags.length - visibleTags.length;
  const presenterLabel = techTalk.presenters.join(', ');

  function handleThumbnailError(): void {
    setThumbnailLoadFailed(true);
  }

  return (
    <article className="group h-full rounded-2xl border border-brand-border bg-brand-surface shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-brand-dark/20 hover:shadow-lg">
      <Link
        href={`/tech-talks/${techTalk.id}`}
        data-testid={`tech-talk-card-${techTalk.id}`}
        className="flex h-full min-w-0 flex-col rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-red"
      >
        <div className="relative aspect-video w-full overflow-hidden rounded-t-2xl bg-brand-dark">
          {thumbnailUrl && !thumbnailLoadFailed ? (
            <Image
              src={thumbnailUrl}
              alt=""
              fill
              unoptimized
              onError={handleThumbnailError}
              sizes="(min-width: 1280px) 36vw, (min-width: 1024px) 50vw, 100vw"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transform-none motion-reduce:transition-none"
            />
          ) : (
            <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-brand-dark px-6 text-white" aria-hidden="true">
              <div
                className="absolute -bottom-14 -left-10 h-40 w-40 rounded-full border-[26px] border-brand-red/25"
                aria-hidden="true"
              />
              <div className="relative flex flex-col items-center gap-3 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-brand-red">
                  <TechTalkIcon className="h-6 w-6" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-display text-lg font-bold tracking-[-0.02em]">
                    1BT-WIKI
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
                    Tech Talk
                  </p>
                </div>
              </div>
            </div>
          )}
          <span className="absolute left-3 top-3 rounded-full bg-brand-red px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-white shadow-sm" aria-hidden="true">
            Tech Talk
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col p-5 sm:p-6">
          <h3 className="line-clamp-2 font-display text-xl font-bold leading-snug tracking-[-0.025em] text-brand-text-primary">
            {techTalk.title}
          </h3>

          {techTalk.description && (
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-brand-text-secondary">
              {techTalk.description}
            </p>
          )}

          {techTalk.presenters.length > 0 && (
            <p className="mt-3 min-w-0 break-words text-sm text-brand-text-secondary">
              Presented by{' '}
              <span className="font-semibold text-brand-text-primary">
                {presenterLabel}
              </span>
            </p>
          )}

          {visibleTags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
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

          <div className="mt-5 border-t border-brand-border pt-4 text-sm text-brand-text-secondary lg:mt-auto">
            <time dateTime={techTalk.eventDate}>
              Event date: {formatDate(techTalk.eventDate)}
            </time>
          </div>
        </div>
      </Link>
    </article>
  );
}
