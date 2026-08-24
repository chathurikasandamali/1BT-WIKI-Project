'use client';

import React from 'react';
import { type PublishedArticleListItem } from '@/lib/api/articles';
import { type TechTalkListItem } from '@/lib/api/techTalks';

interface UserHomepagePopularTagsProps {
  articles: readonly PublishedArticleListItem[];
  techTalks: readonly TechTalkListItem[];
}

const MAX_POPULAR_TAGS = 6;

/**
 * Renders the most frequently occurring tags from content already loaded by
 * the normal-User homepage.
 */
export function UserHomepagePopularTags({
  articles,
  techTalks,
}: UserHomepagePopularTagsProps): React.JSX.Element {
  const articleTags = articles.flatMap(
    (article: PublishedArticleListItem): string[] => article.tags
  );
  const techTalkTags = techTalks.flatMap(
    (techTalk: TechTalkListItem): string[] => techTalk.tags
  );
  const tagCounts = new Map<string, number>();

  [...articleTags, ...techTalkTags].forEach((tag: string): void => {
    tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  });

  const popularTags = Array.from(tagCounts.entries())
    .sort(
      (
        [firstTag, firstCount]: [string, number],
        [secondTag, secondCount]: [string, number]
      ): number => {
        const countDifference = secondCount - firstCount;

        return countDifference !== 0
          ? countDifference
          : firstTag.localeCompare(secondTag, 'en');
      }
    )
    .slice(0, MAX_POPULAR_TAGS);

  return (
    <section
      className="rounded-2xl border border-brand-border bg-brand-surface p-5 shadow-sm sm:p-6"
      aria-labelledby="popular-tags-heading"
    >
      <div className="flex items-center justify-between gap-4">
        <h2
          id="popular-tags-heading"
          className="font-display text-xl font-bold tracking-[-0.03em] text-brand-text-primary"
        >
          Popular tags
        </h2>
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-hover font-display text-lg font-bold text-brand-red"
          aria-hidden="true"
        >
          #
        </span>
      </div>

      {popularTags.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-brand-border bg-brand-hover px-4 py-6 text-center">
          <p className="font-semibold text-brand-text-primary">
            No tags to show yet.
          </p>
          <p className="mt-1 text-sm text-brand-text-secondary">
            Tags from published content will appear here.
          </p>
        </div>
      ) : (
        <ul className="mt-4 flex flex-wrap gap-2">
          {popularTags.map(
            ([tag, count]: [string, number]): React.JSX.Element => (
              <li
                key={tag}
                className="inline-flex max-w-full min-w-0 items-center gap-2 rounded-full border border-brand-border bg-brand-hover px-3 py-1.5"
              >
                <span className="min-w-0 break-words text-sm font-semibold leading-5 text-brand-text-primary">
                  {tag}
                </span>
                <span
                  className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand-surface px-1.5 text-[0.7rem] font-bold text-brand-red"
                  aria-label={`${count} ${count === 1 ? 'occurrence' : 'occurrences'}`}
                >
                  {count}
                </span>
              </li>
            )
          )}
        </ul>
      )}
    </section>
  );
}
