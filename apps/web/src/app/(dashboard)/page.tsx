'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/lib/hooks/useUser';
import { UserRoleValue } from '@repo/shared';
import { HomepageFeed } from '@/components/homepage/HomepageFeed';
import { UserHomepage } from '@/components/homepage/UserHomepage';
import { PageLoader } from '@/components/shared/PageLoader';

/**
 * Home renders a different surface per role: admins get redirected to the
 * dashboard, reviewers get the Latest Updates feed, and everyone else gets
 * the reader homepage.
 */
export default function HomePage(): React.JSX.Element {
  const { user, loading } = useUser();
  const router = useRouter();
  useEffect(() => {
    if (!loading && user?.role === UserRoleValue.Admin) {
      router.replace('/admin');
    }
  }, [user, loading, router]);

  if (loading || user?.role === UserRoleValue.Admin) {
    return <PageLoader />;
  }

  if (user?.role === UserRoleValue.User) {
    return <UserHomepage />;
  }

  return <HomepageFeed />;
}
