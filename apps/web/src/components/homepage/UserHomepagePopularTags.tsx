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
      className="rounded-3xl border border-brand-border bg-brand-surface p-6 shadow-sm sm:p-8"
      aria-labelledby="popular-tags-heading"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-red">
            Across Articles &amp; Tech Talks
          </p>
          <h2
            id="popular-tags-heading"
            className="mt-2 font-display text-2xl font-bold tracking-[-0.03em] text-brand-text-primary"
          >
            Popular Tags
          </h2>
        </div>
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-dark font-display text-xl font-bold text-white"
          aria-hidden="true"
        >
          #
        </span>
      </div>

      {popularTags.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-brand-border bg-brand-hover px-5 py-8 text-center">
          <p className="font-semibold text-brand-text-primary">
            No tags to show yet.
          </p>
          <p className="mt-1 text-sm text-brand-text-secondary">
            Tags from published content will appear here.
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {popularTags.map(
            ([tag, count]: [string, number]): React.JSX.Element => (
              <li
                key={tag}
                className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-brand-border bg-brand-hover px-4 py-3"
              >
                <span
                  className="min-w-0 truncate text-sm font-semibold text-brand-text-primary"
                  title={tag}
                >
                  {tag}
                </span>
                <span
                  className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full bg-brand-red px-2 text-xs font-bold text-white"
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
