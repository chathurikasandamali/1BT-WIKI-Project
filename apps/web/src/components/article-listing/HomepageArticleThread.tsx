'use client';

import React, { useEffect, useState } from 'react';
import { fetchPublishedArticles } from '@/lib/api/articles';
import { type ArticleListItem } from '@/lib/api/articles';
import { ArticleCard } from '@/components/article-listing/ArticleCard';
import { fetchPublishedTechTalks } from '@/lib/api/techTalks';
import { type TechTalkListItem } from '@/lib/api/techTalks';

type HomepageFeedItem =
    | (ArticleListItem & { contentType: 'article' })
    | (TechTalkListItem & { contentType: 'techTalk' });

export function HomepageArticleThread(): React.JSX.Element {
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

    if (loading) {
        return (
            <section>
                <h2 className="text-2xl font-semibold text-brand-text-primary">
                    Latest Articles
                </h2>

                <p className="mt-4 text-brand-text-secondary">
                    Loading articles...
                </p>
            </section>
        );
    }

    if (error) {
        return (
            <section>
                <h2 className="text-2xl font-semibold text-brand-text-primary">
                    Latest Articles
                </h2>

                <p className="mt-4 text-brand-red">
                    {error}
                </p>
            </section>
        );
    }

    if (articles.length === 0) {
        return (
            <section>
                <h2 className="text-2xl font-semibold text-brand-text-primary">
                    Latest Articles
                </h2>

                <p className="mt-4 text-brand-text-secondary">
                    No published articles yet.
                </p>
            </section>
        );
    }

    return (

        <section>
            <h2 className="text-2xl font-semibold text-brand-text-primary">
                Latest Articles
            </h2>

            <div className="mt-6 flex flex-col gap-4">
                {articles.map((article) => (
                    <ArticleCard
                        key={article.id}
                        id={article.id}
                        title={article.title}
                        tags={article.tags}
                        likeCount={article.likeCount}
                        commentCount={article.commentCount}
                        views={article.views}
                        createdAt={article.createdAt}
                    />
                ))}
            </div>
        </section>

    );
}