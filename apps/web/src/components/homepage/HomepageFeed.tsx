'use client';

import React, { useEffect, useState } from 'react';
import { fetchPublishedArticles } from '@/lib/api/articles';
import { type ArticleListItem } from '@/lib/api/articles';
import { ArticleCard } from '@/components/article-listing/ArticleCard';
import { TechTalkCard } from '@/components/tech-talk-listing/TechTalkCard';
import { fetchPublishedTechTalks } from '@/lib/api/techTalks';
import { type TechTalkListItem } from '@/lib/api/techTalks';

type HomepageFeedItem =
    | (ArticleListItem & { contentType: 'article' })
    | (TechTalkListItem & { contentType: 'techTalk' });

export function HomepageFeed(): React.JSX.Element {
    const [articles, setArticles] = useState<ArticleListItem[]>([]);
    const [techTalks, setTechTalks] = useState<TechTalkListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        async function loadHomepageContent() {
            try {
                setLoading(true);
                setError(null);

                const [articleResult, techTalkResult] = await Promise.all([
                    fetchPublishedArticles(),
                    fetchPublishedTechTalks(),
                ]);

                if (isMounted) {
                    setArticles(articleResult.articles);
                    setTechTalks(techTalkResult.techTalks);
                }
            } catch (err: unknown) {
                if (isMounted) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : 'Failed to load homepage content'
                    );
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        loadHomepageContent();

        return () => {
            isMounted = false;
        };
    }, []);

    const feedItems: HomepageFeedItem[] = [
        ...articles.map((article): HomepageFeedItem => ({
            ...article,
            contentType: 'article',
        })),

        ...techTalks.map((techTalk): HomepageFeedItem => ({
            ...techTalk,
            contentType: 'techTalk',
        })),
    ].sort(
        (a, b) =>
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime()
    );

    if (loading) {
        return (
            <section>
                <h2 className="text-2xl font-semibold text-brand-text-primary">
                    Latest Updates
                </h2>

                <p className="mt-4 text-brand-text-secondary">
                    Loading latest updates...
                </p>
            </section>
        );
    }

    if (error) {
        return (
            <section>
                <h2 className="text-2xl font-semibold text-brand-text-primary">
                    Latest Updates
                </h2>

                <p className="mt-4 text-brand-red">
                    {error}
                </p>
            </section>
        );
    }

    if (feedItems.length === 0) {
        return (
            <section>
                <h2 className="text-2xl font-semibold text-brand-text-primary">
                    Latest Updates
                </h2>

                <p className="mt-4 text-brand-text-secondary">
                    No published content yet.
                </p>
            </section>
        );
    }

    return (

        <section>
            <h2 className="text-2xl font-semibold text-brand-text-primary">
                Latest Updates
            </h2>

            <div className="mt-6 flex flex-col gap-4">
                {feedItems.map((item) => {
                    if (item.contentType === 'article') {
                        return (
                            <ArticleCard
                                key={`article-${item.id}`}
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
                            key={`techTalk-${item.id}`}
                            id={item.id}
                            title={item.title}
                            tags={item.tags}
                            presenters={item.presenters}
                            eventDate={item.eventDate}
                        />
                    );
                })}
            </div>
        </section>

    );
}