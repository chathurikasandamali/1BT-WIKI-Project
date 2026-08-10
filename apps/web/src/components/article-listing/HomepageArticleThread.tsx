'use client';

import React, { useEffect, useState } from 'react';
import {
    fetchPublishedArticles,
    type ArticleListItem,
} from '@/lib/api/articles';
import { ArticleCard } from '@/components/article-listing/ArticleCard';

export function HomepageArticleThread(): React.JSX.Element {
    const [articles, setArticles] = useState<ArticleListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        async function loadArticles() {
            try {
                setLoading(true);
                setError(null);

                const result = await fetchPublishedArticles();

                if (isMounted) {
                    setArticles(result.articles);
                }
            } catch (err: unknown) {
                if (isMounted) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : 'Failed to load published articles'
                    );
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        loadArticles();

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