'use client';

import React, { useState } from 'react';
import {
    type ArticleListItem,
} from '@/lib/api/articles';

export function HomepageArticleThread(): React.JSX.Element {
    const [articles] = useState<ArticleListItem[]>([]);
    const [loading] = useState(true);
    const [error] = useState<string | null>(null);

    return (
        <section>
            <h2 className="text-2xl font-semibold text-brand-text-primary">
                Latest Articles
            </h2>
        </section>
    );
}