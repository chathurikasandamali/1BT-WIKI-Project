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
    <article className="group overflow-hidden rounded-2xl border border-brand-border bg-brand-surface shadow-sm transition-all duration-200 hover:border-brand-dark/20 hover:shadow-lg">
      <Link
        href={`/tech-talks/${techTalk.id}`}
        data-testid={`tech-talk-card-${techTalk.id}`}
        className="grid min-w-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-red sm:grid-cols-[minmax(14rem,0.85fr)_minmax(0,1.4fr)] lg:grid-cols-[minmax(18rem,0.85fr)_minmax(0,1.5fr)]"
      >
        <div className="relative aspect-video w-full overflow-hidden bg-brand-dark">
          {thumbnailUrl && !thumbnailLoadFailed ? (
            <Image
              src={thumbnailUrl}
              alt={`${techTalk.title} Tech Talk video thumbnail`}
              fill
              unoptimized
              onError={handleThumbnailError}
              sizes="(min-width: 1024px) 18rem, (min-width: 640px) 36vw, 100vw"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-brand-dark px-6 text-white">
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
        </div>

        <div className="flex min-w-0 flex-col p-5 sm:p-6">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-brand-red">
            <TechTalkIcon className="h-4 w-4" aria-hidden="true" />
            <span>Tech Talk</span>
          </div>

          <h3 className="mt-3 line-clamp-2 font-display text-xl font-bold leading-snug tracking-[-0.025em] text-brand-text-primary sm:text-2xl">
            {techTalk.title}
          </h3>

          {techTalk.description && (
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-brand-text-secondary">
              {techTalk.description}
            </p>
          )}

          <p className="mt-3 text-sm text-brand-text-secondary">
            Presented by{' '}
            <span className="font-semibold text-brand-text-primary">
              {presenterLabel}
            </span>
          </p>

          {visibleTags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {visibleTags.map((tag) => (
                <span
                  key={tag}
                  className="max-w-40 truncate rounded-full border border-brand-border bg-brand-hover px-2.5 py-1 text-xs font-medium text-brand-text-secondary"
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

          <div className="mt-5 border-t border-brand-border pt-4 text-sm text-brand-text-secondary sm:mt-auto">
            <time dateTime={techTalk.eventDate}>
              Event date: {formatDate(techTalk.eventDate)}
            </time>
          </div>
        </div>
      </Link>
    </article>
  );
}
