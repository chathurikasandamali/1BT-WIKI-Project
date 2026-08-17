'use client';

import React from 'react';
import Link from 'next/link';
import { TechTalkIcon } from '@/components/shared/icons/TechTalkIcon';
import { UsersIcon } from '@/components/shared/icons/UsersIcon';
import { type TechTalkListItem } from '@/lib/api/techTalks';
import { formatDate } from '@/lib/utils/date';

interface UserHomepageUpcomingEventsProps {
  techTalks: readonly TechTalkListItem[];
}

const MAX_UPCOMING_EVENTS = 3;
const MAX_VISIBLE_TAGS = 3;

export function UserHomepageUpcomingEvents({
  techTalks,
}: UserHomepageUpcomingEventsProps): React.JSX.Element {
  const currentTime = Date.now();
  const upcomingEvents = [...techTalks]
    .filter(
      (techTalk): boolean =>
        new Date(techTalk.eventDate).getTime() > currentTime
    )
    .sort(
      (firstEvent, secondEvent): number =>
        new Date(firstEvent.eventDate).getTime() -
        new Date(secondEvent.eventDate).getTime()
    )
    .slice(0, MAX_UPCOMING_EVENTS);

  return (
    <section
      className="rounded-3xl border border-brand-border bg-brand-surface p-6 shadow-sm sm:p-8"
      aria-labelledby="upcoming-events-heading"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-red">
            What&apos;s next
          </p>
          <h2
            id="upcoming-events-heading"
            className="mt-2 font-display text-2xl font-bold tracking-[-0.03em] text-brand-text-primary"
          >
            Upcoming Events
          </h2>
        </div>
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-dark text-white"
          aria-hidden="true"
        >
          <TechTalkIcon className="h-5 w-5" />
        </span>
      </div>

      {upcomingEvents.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-brand-border bg-brand-hover px-5 py-8 text-center">
          <p className="font-semibold text-brand-text-primary">
            No upcoming events scheduled.
          </p>
          <p className="mt-1 text-sm text-brand-text-secondary">
            Future Tech Talks will appear here.
          </p>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {upcomingEvents.map((event) => {
            const visibleTags = event.tags.slice(0, MAX_VISIBLE_TAGS);
            const remainingTagCount = event.tags.length - visibleTags.length;
            const presenterLabel = event.presenters.join(', ');

            return (
              <article key={event.id}>
                <Link
                  href={`/tech-talks/${event.id}`}
                  className="group block rounded-2xl border border-brand-border bg-brand-surface p-5 transition-all 
                  duration-200 hover:border-brand-dark/20 hover:bg-brand-hover hover:shadow-md focus-visible:outline 
                  focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-red"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-brand-red">
                        <TechTalkIcon className="h-4 w-4" aria-hidden="true" />
                        <span>Tech Talk</span>
                      </p>
                      <h3 className="mt-2 line-clamp-2 font-display text-lg font-bold leading-snug tracking-[-0.02em] 
                      text-brand-text-primary group-hover:text-brand-red">
                        {event.title}
                      </h3>
                    </div>
                    <time
                      dateTime={event.eventDate}
                      className="shrink-0 rounded-full bg-brand-dark px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      {formatDate(event.eventDate)}
                    </time>
                  </div>

                  {presenterLabel && (
                    <p className="mt-3 flex items-start gap-2 text-sm text-brand-text-secondary">
                      <UsersIcon
                        className="mt-0.5 h-4 w-4 shrink-0 text-brand-red"
                        aria-hidden="true"
                      />
                      <span>
                        Presented by{' '}
                        <span className="font-semibold text-brand-text-primary">
                          {presenterLabel}
                        </span>
                      </span>
                    </p>
                  )}

                  {visibleTags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {visibleTags.map((tag) => (
                        <span
                          key={tag}
                          className="max-w-36 truncate rounded-full border border-brand-border bg-brand-hover px-2.5 py-1 text-xs 
                          font-medium text-brand-text-secondary group-hover:bg-brand-surface"
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
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
