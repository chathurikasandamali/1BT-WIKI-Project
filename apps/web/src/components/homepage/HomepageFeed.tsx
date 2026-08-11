'use client';

import React from 'react';
import { fetchPublishedArticles } from '@/lib/api/articles';
import { type ArticleListItem } from '@/lib/api/articles';
import { ArticleCard } from '@/components/article-listing/ArticleCard';
import { TechTalkCard } from '@/components/tech-talk-listing/TechTalkCard';
import { fetchPublishedTechTalks } from '@/lib/api/techTalks';
import { type TechTalkListItem } from '@/lib/api/techTalks';
import { useAsync } from '@/lib/hooks/useAsync';

enum HomepageFeedItemType {
    Article = 'article',
    TechTalk = 'techTalk',
}

type HomepageFeedItem =
    | (
        ArticleListItem & {
            contentType: HomepageFeedItemType.Article;
        }
    )
    | (
        TechTalkListItem & {
            contentType: HomepageFeedItemType.TechTalk;
        }
    );

export function HomepageFeed(): React.JSX.Element {
    const fetchFeedData = async (signal?: AbortSignal) => {
        const [articleResult, techTalkResult] = await Promise.all([
            fetchPublishedArticles(undefined, undefined, { signal }),
            fetchPublishedTechTalks(undefined, undefined, { signal }),
        ]);

        return {
            articles: articleResult.articles,
            techTalks: techTalkResult.techTalks,
        };
    };

    const { data, loading, error } = useAsync(fetchFeedData, [], {
        useAbortSignal: true,
    });

    const articles = data?.articles ?? [];
    const techTalks = data?.techTalks ?? [];

    const feedItems: HomepageFeedItem[] = [
        ...articles.map((article): HomepageFeedItem => ({
            ...article,
            contentType: HomepageFeedItemType.Article,
        })),

        ...techTalks.map((techTalk): HomepageFeedItem => ({
            ...techTalk,
            contentType: HomepageFeedItemType.TechTalk,
        })),
    ].sort(
        (a, b) =>
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime()
    );

    let content: React.ReactNode;

    if (loading) {
        content = (
            <p className="mt-4 text-brand-text-secondary">
                Loading latest updates...
            </p>
        );
    } else if (error) {
        content = (
            <p className="mt-4 text-brand-red">
                {error}
            </p>
        );
    } else if (feedItems.length === 0) {
        content = (
            <p className="mt-4 text-brand-text-secondary">
                No published content yet.
            </p>
        );
    } else {
        content = (
            <div className="mt-6 flex flex-col gap-4">
                {feedItems.map((item) => {
                    if (item.contentType === HomepageFeedItemType.Article) {
                        return (
                            <ArticleCard
                                key={`${HomepageFeedItemType.Article}-${item.id}`}
                                id={item.id}
                                title={item.title}
                                tags={item.tags}
                                likeCount={item.likeCount}
                                commentCount={item.commentCount}
                                views={item.views}
                                createdAt={item.createdAt}
                            />
                        );
                    }

                    return (
                        <TechTalkCard
                            key={`${HomepageFeedItemType.TechTalk}-${item.id}`}
                            id={item.id}
                            title={item.title}
                            tags={item.tags}
                            presenters={item.presenters}
                            eventDate={item.eventDate}
                        />
                    );
                })}
            </div>
        );
    }

    return (
        <section>
            <h2 className="text-2xl font-semibold text-brand-text-primary">
                Latest Updates
            </h2>
            {content}
        </section>
    );
}