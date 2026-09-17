'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchPublishedArticles,
  type PublishedArticleListItem,
} from '@/lib/api/articles';
import {
  fetchPublishedTechTalks,
  type TechTalkListItem,
} from '@/lib/api/techTalks';
import { FilterChip } from '@/components/admin/FilterChip';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageLoader } from '@/components/shared/PageLoader';
import { ArticleIcon } from '@/components/shared/icons/ArticleIcon';
import { ReviewerHomepageArticleCard } from '@/components/homepage/ReviewerHomepageArticleCard';
import { ReviewerHomepageTechTalkCard } from '@/components/homepage/ReviewerHomepageTechTalkCard';

enum HomepageFeedItemType {
  Article = 'article',
  TechTalk = 'techTalk',
}

type HomepageFeedFilter = 'All' | HomepageFeedItemType;

type HomepageFeedItem =
  | (PublishedArticleListItem & {
      contentType: HomepageFeedItemType.Article;
    })
  | (TechTalkListItem & {
      contentType: HomepageFeedItemType.TechTalk;
    });

const FEED_FILTERS: HomepageFeedFilter[] = [
  'All',
  HomepageFeedItemType.Article,
  HomepageFeedItemType.TechTalk,
];

const FILTER_LABELS: Record<HomepageFeedFilter, string> = {
  All: 'All',
  [HomepageFeedItemType.Article]: 'Articles',
  [HomepageFeedItemType.TechTalk]: 'Tech Talks',
};

const PAGE_SIZE = 10;

/**
 * Returns true when the feed item matches the selected type filter.
 */
function matchesFeedFilter(
  item: HomepageFeedItem,
  filter: HomepageFeedFilter
): boolean {
  if (filter === 'All') {
    return true;
  }
  return item.contentType === filter;
}

/**
 * Appends incoming rows without duplicating IDs already in the list.
 */
function mergeById<T extends { id: string }>(
  existing: T[],
  incoming: T[]
): T[] {
  const seen = new Set(existing.map((item) => item.id));
  return [...existing, ...incoming.filter((item) => !seen.has(item.id))];
}

/**
 * Reviewer Home: chronological Latest Updates feed of published articles and Tech Talks.
 */
export function HomepageFeed(): React.JSX.Element {
  const [filter, setFilter] = useState<HomepageFeedFilter>('All');
  const [articles, setArticles] = useState<PublishedArticleListItem[]>([]);
  const [techTalks, setTechTalks] = useState<TechTalkListItem[]>([]);
  const [articlePage, setArticlePage] = useState(1);
  const [techTalkPage, setTechTalkPage] = useState(1);
  const [articleTotal, setArticleTotal] = useState(0);
  const [techTalkTotal, setTechTalkTotal] = useState(0);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadMoreInFlightRef = useRef(false);

  const loadInitialPage = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const [articleResult, techTalkResult] = await Promise.all([
        fetchPublishedArticles({ page: 1, limit: PAGE_SIZE, signal }),
        fetchPublishedTechTalks({ page: 1, limit: PAGE_SIZE, signal }),
      ]);

      if (signal?.aborted) {
        return;
      }

      setArticles(articleResult.articles);
      setTechTalks(techTalkResult.techTalks);
      setArticlePage(1);
      setTechTalkPage(1);
      setArticleTotal(articleResult.total ?? articleResult.articles.length);
      setTechTalkTotal(techTalkResult.total ?? techTalkResult.techTalks.length);
      setVisibleCount(PAGE_SIZE);
    } catch (err) {
      if (signal?.aborted) {
        return;
      }
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred'
      );
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const abortController = new AbortController();
    void loadInitialPage(abortController.signal);
    return () => {
      abortController.abort();
    };
  }, [loadInitialPage]);

  const feedItems: HomepageFeedItem[] = useMemo(
    () =>
      [
        ...articles.map(
          (article): HomepageFeedItem => ({
            ...article,
            contentType: HomepageFeedItemType.Article,
          })
        ),
        ...techTalks.map(
          (techTalk): HomepageFeedItem => ({
            ...techTalk,
            contentType: HomepageFeedItemType.TechTalk,
          })
        ),
      ].sort(
        (firstItem, secondItem) =>
          new Date(secondItem.createdAt).getTime() -
          new Date(firstItem.createdAt).getTime()
      ),
    [articles, techTalks]
  );

  const filteredItems = feedItems.filter((item) =>
    matchesFeedFilter(item, filter)
  );
  const displayedItems = filteredItems.slice(0, visibleCount);
  const hasMoreBuffered = visibleCount < filteredItems.length;
  const hasMoreArticles = articles.length < articleTotal;
  const hasMoreTechTalks = techTalks.length < techTalkTotal;
  const hasMore = hasMoreBuffered || hasMoreArticles || hasMoreTechTalks;

  const loadMore = useCallback(async () => {
    if (loadMoreInFlightRef.current || !hasMore) {
      return;
    }

    loadMoreInFlightRef.current = true;

    if (hasMoreBuffered) {
      setVisibleCount((count) => count + PAGE_SIZE);
      loadMoreInFlightRef.current = false;
      return;
    }

    setLoadingMore(true);
    try {
      const nextArticlePage = articlePage + 1;
      const nextTechTalkPage = techTalkPage + 1;
      const requests: Array<Promise<void>> = [];

      if (hasMoreArticles) {
        requests.push(
          fetchPublishedArticles({ page: nextArticlePage, limit: PAGE_SIZE }).then(
            (result) => {
              setArticles((current) => mergeById(current, result.articles));
              setArticlePage(nextArticlePage);
              setArticleTotal(result.total);
            }
          )
        );
      }

      if (hasMoreTechTalks) {
        requests.push(
          fetchPublishedTechTalks({
            page: nextTechTalkPage,
            limit: PAGE_SIZE,
          }).then((result) => {
            setTechTalks((current) => mergeById(current, result.techTalks));
            setTechTalkPage(nextTechTalkPage);
            setTechTalkTotal(result.total);
          })
        );
      }

      await Promise.all(requests);
      setVisibleCount((count) => count + PAGE_SIZE);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred'
      );
    } finally {
      loadMoreInFlightRef.current = false;
      setLoadingMore(false);
    }
  }, [
    articlePage,
    hasMore,
    hasMoreArticles,
    hasMoreBuffered,
    hasMoreTechTalks,
    techTalkPage,
  ]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filter]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || loading || !hasMore) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const isVisible = entries[0]?.isIntersecting === true;
        if (isVisible) {
          void loadMore();
        }
      },
      { root: null, rootMargin: '160px', threshold: 0 }
    );

    observer.observe(sentinel);
    return () => {
      observer.disconnect();
    };
  }, [hasMore, loadMore, loading, displayedItems.length]);

  const handleFilterChange = (nextFilter: HomepageFeedFilter): void => {
    setFilter(nextFilter);
  };

  let content: React.ReactNode;

  if (loading) {
    content = <PageLoader className="min-h-0 py-16" />;
  } else if (error && articles.length === 0 && techTalks.length === 0) {
    content = (
      <div
        className="rounded-2xl border border-brand-red/20 bg-brand-red/10 px-6 py-10 text-center text-sm text-brand-red"
        role="alert"
      >
        {error}
      </div>
    );
  } else if (feedItems.length === 0) {
    content = (
      <div className="rounded-2xl border border-dashed border-brand-border bg-brand-surface">
        <EmptyState
          title="No published content yet."
          description="Approved articles and published Tech Talks will appear here as they go live."
          icon={<ArticleIcon className="h-6 w-6" />}
        />
      </div>
    );
  } else if (filteredItems.length === 0) {
    content = (
      <div className="rounded-2xl border border-dashed border-brand-border bg-brand-surface">
        <EmptyState
          title="Nothing in this filter yet."
          description="Try All to see every published article and Tech Talk."
          icon={<ArticleIcon className="h-6 w-6" />}
        />
      </div>
    );
  } else {
    content = (
      <div className="flex flex-col gap-4" data-testid="reviewer-latest-updates-list">
        {displayedItems.map((item) => {
          if (item.contentType === HomepageFeedItemType.Article) {
            return (
              <ReviewerHomepageArticleCard
                key={`${HomepageFeedItemType.Article}-${item.id}`}
                id={item.id}
                title={item.title}
                tags={item.tags}
                likeCount={item.likeCount}
                commentCount={item.commentCount}
                views={item.views}
                createdAt={item.createdAt}
                authorName={item.authorName}
                coverImageUrl={item.coverImageUrl}
              />
            );
          }

          return (
            <ReviewerHomepageTechTalkCard
              key={`${HomepageFeedItemType.TechTalk}-${item.id}`}
              techTalk={item}
            />
          );
        })}

        <div
          ref={sentinelRef}
          className="flex flex-col items-center gap-2 py-4"
          data-testid="see-more-sentinel"
        >
          {hasMore && (
            <button
              type="button"
              onClick={() => {
                void loadMore();
              }}
              disabled={loadingMore}
              data-testid="see-more-button"
              className="text-sm font-medium text-brand-red transition-colors hover:text-brand-red-hover disabled:opacity-60"
            >
              {loadingMore ? 'Loading more…' : 'See more'}
            </button>
          )}
          {hasMore && (
            <p className="text-xs text-brand-text-secondary">
              Scroll to load the next {PAGE_SIZE} updates
            </p>
          )}
          {!hasMore && displayedItems.length > PAGE_SIZE && (
            <p className="text-xs text-brand-text-secondary">
              You have reached the end of the feed.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-8" data-testid="reviewer-homepage">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-brand-text-primary">
            Latest Updates
          </h1>
          <p className="mt-1 text-sm text-brand-text-secondary">
            Published articles and Tech Talks, newest first.
          </p>
        </div>
        <p className="shrink-0 text-sm font-medium text-brand-text-secondary">
          {displayedItems.length}
          {hasMore ? '+' : ''} of {articleTotal + techTalkTotal} update
          {articleTotal + techTalkTotal === 1 ? '' : 's'}
        </p>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-1.5">
        {FEED_FILTERS.map((value) => (
          <FilterChip
            key={value}
            label={FILTER_LABELS[value]}
            selected={filter === value}
            onClick={() => handleFilterChange(value)}
          />
        ))}
      </div>

      {content}
    </div>
  );
}
