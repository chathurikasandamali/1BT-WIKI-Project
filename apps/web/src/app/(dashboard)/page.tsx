'use client';

// Homepage — placeholder until FA-05 (homepage feed) is implemented.
// The /api/users call was scaffolding from create-next-app and has been removed.
// Real article feed will be wired here by Malindu in FA-05.
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/lib/hooks/useUser';
import { BRAND_FULL_NAME } from '@/lib/constants/brand';
import { HomepageArticleThread } from '@/components/article-listing/HomepageArticleThread';

export default function HomePage(): React.JSX.Element {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user?.role === 'Admin') {
      router.replace('/admin');
    }
  }, [user, loading, router]);

  // Show a loading state while we determine the user's role,
  // OR if we know they are an Admin and are currently redirecting them,
  // to avoid a visible flicker of the actual homepage content.
  if (loading || user?.role === 'Admin') {
    return (
      <div className="p-8 flex justify-center items-center">
        <div className="text-brand-textSecondary">Loading...</div>
      </div>
    );
  }

  return (
    <HomepageArticleThread />
  );
}
