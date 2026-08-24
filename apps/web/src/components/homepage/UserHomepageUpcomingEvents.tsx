'use client';

import React from 'react';
import Link from 'next/link';
import { TechTalkIcon } from '@/components/shared/icons/TechTalkIcon';
import { UsersIcon } from '@/components/shared/icons/UsersIcon';
import { type TechTalkListItem } from '@/lib/api/techTalks';

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
      className="rounded-2xl border border-brand-border bg-brand-surface p-5 shadow-sm sm:p-6"
      aria-labelledby="upcoming-events-heading"
    >
      <div className="flex items-center justify-between gap-4">
        <h2
          id="upcoming-events-heading"
          className="font-display text-xl font-bold tracking-[-0.03em] text-brand-text-primary"
        >
          Upcoming events
        </h2>
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-hover text-brand-red"
          aria-hidden="true"
        >
          <TechTalkIcon className="h-4 w-4" />
        </span>
      </div>

      {upcomingEvents.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-brand-border bg-brand-hover px-4 py-6 text-center">
          <p className="font-semibold text-brand-text-primary">
            No upcoming events scheduled.
          </p>
          <p className="mt-1 text-sm text-brand-text-secondary">
            Future Tech Talks will appear here.
          </p>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-brand-border">
          {upcomingEvents.map((event) => {
            const visibleTags = event.tags.slice(0, MAX_VISIBLE_TAGS);
            const remainingTagCount = event.tags.length - visibleTags.length;
            const presenterLabel = event.presenters.join(', ');
            const eventDate = new Date(event.eventDate);
            const eventMonth = eventDate
              .toLocaleDateString('en-US', { month: 'short' })
              .toUpperCase();
            const eventDay = eventDate.toLocaleDateString('en-US', {
              day: 'numeric',
            });

            return (
              <li key={event.id}>
                <Link
                  href={`/tech-talks/${event.id}`}
                  className="group flex min-w-0 items-start gap-3 rounded-xl px-2 py-4 transition-colors duration-200 hover:bg-brand-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-red motion-reduce:transition-none sm:gap-4"
                >
                  <time
                    dateTime={event.eventDate}
                    className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border border-brand-border bg-brand-hover text-center"
                  >
                    <span className="text-[0.65rem] font-bold tracking-[0.12em] text-brand-red">
                      {eventMonth}
                    </span>
                    <span className="font-display text-lg font-bold leading-none text-brand-text-primary">
                      {eventDay}
                    </span>
                  </time>

                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 break-words font-display text-base font-bold leading-snug tracking-[-0.02em] text-brand-text-primary group-hover:text-brand-red">
                      {event.title}
                    </h3>

                    {presenterLabel && (
                      <p className="mt-2 flex min-w-0 items-start gap-2 text-sm text-brand-text-secondary">
                        <UsersIcon
                          className="mt-0.5 h-4 w-4 shrink-0 text-brand-red"
                          aria-hidden="true"
                        />
                        <span className="min-w-0 break-words">
                          Presented by{' '}
                          <span className="font-semibold text-brand-text-primary">
                            {presenterLabel}
                          </span>
                        </span>
                      </p>
                    )}

                    {visibleTags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {visibleTags.map((tag) => (
                          <span
                            key={tag}
                            className="max-w-full truncate rounded-full border border-brand-border bg-brand-hover px-2 py-0.5 text-xs font-medium text-brand-text-secondary group-hover:bg-brand-surface"
                          >
                            {tag}
                          </span>
                        ))}
                        {remainingTagCount > 0 && (
                          <span className="rounded-full border border-brand-border bg-brand-surface px-2 py-0.5 text-xs font-semibold text-brand-text-secondary">
                            +{remainingTagCount}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
