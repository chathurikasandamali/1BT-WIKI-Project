'use client';

import Link from 'next/link';
import { useUser } from '@/lib/hooks/useUser';
import { MyArticlesList } from '@/components/profile/MyArticlesList';
import { PlusIcon } from '@/components/shared/icons/PlusIcon';

export default function MyArticlesPage() {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-sm text-brand-text-secondary">
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 text-brand-text-secondary">
        Please sign in to view your articles.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-8">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-brand-text-primary">
            My Articles
          </h1>
          <p className="mt-1 text-sm text-brand-text-secondary">
            Track submitted articles and keep writing your drafts in one place.
          </p>
        </div>
        <Link
          href="/editor"
          className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded bg-brand-red px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-red-hover sm:self-auto"
        >
          <PlusIcon className="h-4 w-4" />
          Create New Article
        </Link>
      </div>
      <MyArticlesList />
    </div>
  );
}
