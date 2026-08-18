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
      <div className="mt-6 flex flex-col gap-4">
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
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <section className="overflow-hidden rounded-3xl border border-white/10 bg-brand-dark px-6 py-10 shadow-xl 
      shadow-black/5 sm:px-10 sm:py-14 lg:px-14 lg:py-16">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-red">
            Built by the 1BT community
          </p>
          <h1 className="mt-5 font-display text-4xl font-bold tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">
            Latest from the team.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
            Ideas, lessons and conversations worth sharing.
          </p>
        </div>
      </section>

      <section
        className="py-10 sm:py-12"
        aria-labelledby="latest-updates-heading"
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
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

          <div
            className="w-fit shrink-0 rounded-full border border-brand-border bg-brand-surface px-4 py-2 text-sm font-medium 
            text-brand-text-secondary"
            aria-label="Sort order: Newest first"
          >
            Newest first
          </div>
        </div>

        {feedContent}
      </section>

      {!loading && !error && data && (
        <div className="grid gap-6 pb-10 sm:pb-12 lg:grid-cols-2 lg:items-start">
          <UserHomepageUpcomingEvents techTalks={techTalks} />
          <UserHomepagePopularTags
            articles={articles}
            techTalks={techTalks}
          />
        </div>
      )}
    </div>
  );
}
