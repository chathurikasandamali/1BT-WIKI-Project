'use client';

import { useUser } from '@/lib/hooks/useUser';
import { MyArticlesList } from '@/components/profile/MyArticlesList';
import { PageLoader } from '@/components/shared/PageLoader';

export default function MyArticlesPage() {
  const { user, loading } = useUser();

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return (
      <div className="p-8 text-brand-text-secondary">
        Please sign in to view your articles.
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold text-brand-text-primary mb-8">
        My Articles
      </h1>
      <MyArticlesList />
    </div>
  );
}
