'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/lib/hooks/useUser';
import { UserRoleValue } from '@repo/shared';
import { HomepageFeed } from '@/components/homepage/HomepageFeed';
import { UserHomepage } from '@/components/homepage/UserHomepage';
import { PageLoader } from '@/components/shared/PageLoader';

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
