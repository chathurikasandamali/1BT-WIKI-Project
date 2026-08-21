'use client';

import React, { useState } from 'react';
import { UserHomepageArticleCard } from '@/components/homepage/UserHomepageArticleCard';
import { UserHomepagePopularTags } from '@/components/homepage/UserHomepagePopularTags';
import { UserHomepageTechTalkCard } from '@/components/homepage/UserHomepageTechTalkCard';
import { UserHomepageUpcomingEvents } from '@/components/homepage/UserHomepageUpcomingEvents';
import {
  fetchPublishedArticles,
  type PublishedArticleListItem,
} from '@/lib/api/articles';
import {
  fetchPublishedTechTalks,
  type TechTalkListItem,
} from '@/lib/api/techTalks';
import { useAsync } from '@/lib/hooks/useAsync';
import { cn } from '@/lib/utils';

enum UserHomepageFeedItemType {
  Article = 'article',
  TechTalk = 'techTalk',
}

const ALL_FEED_ITEMS = 'all' as const;

type UserHomepageFeedFilter = typeof ALL_FEED_ITEMS | UserHomepageFeedItemType;

type UserHomepageFeedItem =
  | (PublishedArticleListItem & {
    contentType: UserHomepageFeedItemType.Article;
  })
  | (TechTalkListItem & {
    contentType: UserHomepageFeedItemType.TechTalk;
  });

const FILTERS: Array<{
  label: string;
  value: UserHomepageFeedFilter;
}> = [
    { label: 'All', value: ALL_FEED_ITEMS },
    { label: 'Articles', value: UserHomepageFeedItemType.Article },
    { label: 'Tech Talks', value: UserHomepageFeedItemType.TechTalk },
  ];

async function fetchUserHomepageContent(signal?: AbortSignal) {
  const [articleResult, techTalkResult] = await Promise.all([
    fetchPublishedArticles({ signal }),
    fetchPublishedTechTalks({ signal }),
  ]);

  return {
    articles: articleResult.articles,
    techTalks: techTalkResult.techTalks,
  };
}

export function UserHomepage(): React.JSX.Element {
  const [activeFilter, setActiveFilter] =
    useState<UserHomepageFeedFilter>(ALL_FEED_ITEMS);
  const { data, loading, error } = useAsync(fetchUserHomepageContent, [], {
    useAbortSignal: true,
  });
  const articles = data?.articles ?? [];
  const techTalks = data?.techTalks ?? [];
  const showHomepageRail = !loading && !error && data !== null;

  const feedItems: UserHomepageFeedItem[] = [
    ...articles.map(
      (article): UserHomepageFeedItem => ({
        ...article,
        contentType: UserHomepageFeedItemType.Article,
      })
    ),
    ...techTalks.map(
      (techTalk): UserHomepageFeedItem => ({
        ...techTalk,
        contentType: UserHomepageFeedItemType.TechTalk,
      })
    ),
  ].sort(
    (firstItem, secondItem) =>
      new Date(secondItem.createdAt).getTime() -
      new Date(firstItem.createdAt).getTime()
  );

  const visibleFeedItems =
    activeFilter === ALL_FEED_ITEMS
      ? feedItems
      : feedItems.filter((item) => item.contentType === activeFilter);

  let feedContent: React.ReactNode;

  if (loading) {
    feedContent = (
      <div
        className="mt-6 rounded-2xl border border-brand-border bg-brand-surface px-6 py-12 
        text-center text-brand-text-secondary"
        role="status"
      >
        Loading latest updates...
      </div>
    );
  } else if (error) {
    feedContent = (
      <div
        className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-6 py-12 text-center text-brand-red"
        role="alert"
      >
        We could not load the latest updates. Please try again later.
      </div>
    );
  } else if (feedItems.length === 0) {
    feedContent = (
      <div className="mt-6 rounded-2xl border border-dashed border-brand-border bg-brand-surface 
      px-6 py-12 text-center text-brand-text-secondary">
        No published content yet.
      </div>
    );
  } else if (visibleFeedItems.length === 0) {
    feedContent = (
      <div className="mt-6 rounded-2xl border border-dashed border-brand-border bg-brand-surface px-6 
      py-12 text-center text-brand-text-secondary">
        No{' '}
        {activeFilter === UserHomepageFeedItemType.Article
          ? 'articles'
          : 'Tech Talks'}{' '}
        yet.
      </div>
    );
  } else {
    feedContent = (
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {visibleFeedItems.map((item) => {
          if (item.contentType === UserHomepageFeedItemType.Article) {
            return (
              <UserHomepageArticleCard
                key={`${UserHomepageFeedItemType.Article}-${item.id}`}
                id={item.id}
                title={item.title}
                tags={item.tags}
                likeCount={item.likeCount}
                commentCount={item.commentCount}
                views={item.views}
                createdAt={item.createdAt}
                coverImageUrl={item.coverImageUrl}
              />
            );
          }

          return (
            <UserHomepageTechTalkCard
              key={`${UserHomepageFeedItemType.TechTalk}-${item.id}`}
              techTalk={item}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 pb-10 pt-10 sm:px-6 sm:pb-12 sm:pt-14 lg:px-8 lg:pt-16">
      <section className="max-w-4xl pb-10 sm:pb-12 lg:pb-14">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-red">
            Built by the 1BT community
          </p>
          <h1 className="mt-4 font-display text-4xl font-bold tracking-[-0.04em] text-brand-text-primary sm:text-5xl lg:text-6xl">
            Latest from the team
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-brand-text-secondary sm:text-lg">
            Ideas, lessons and conversations worth sharing.
          </p>
        </div>
      </section>

      <div
        className={cn(
          'grid gap-8 xl:gap-10',
          showHomepageRail &&
            'xl:grid-cols-[minmax(0,3fr)_minmax(18rem,1fr)] xl:items-start'
        )}
      >
        <section aria-labelledby="latest-updates-heading">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2
                id="latest-updates-heading"
                className="font-display text-2xl font-bold tracking-[-0.03em] text-brand-text-primary sm:text-3xl"
              >
                Latest updates
              </h2>
              <div
                className="mt-4 flex flex-wrap gap-2"
                role="group"
                aria-label="Filter latest updates"
              >
                {FILTERS.map((filter) => {
                  const isActive = activeFilter === filter.value;

                  return (
                    <button
                      key={filter.value}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setActiveFilter(filter.value)}
                      className={cn(
                        'rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-red',
                        isActive
                          ? 'border-brand-red bg-brand-red text-white'
                          : 'border-brand-border bg-brand-surface text-brand-text-primary hover:border-brand-dark hover:bg-brand-hover'
                      )}
                    >
                      {filter.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="shrink-0 text-sm font-medium text-brand-text-secondary">
              Newest first
            </p>
          </div>

          {feedContent}
        </section>

        {showHomepageRail && (
          <aside className="grid gap-6">
            <UserHomepageUpcomingEvents techTalks={techTalks} />
            <UserHomepagePopularTags
              articles={articles}
              techTalks={techTalks}
            />
          </aside>
        )}
      </div>
    </div>
  );
}
