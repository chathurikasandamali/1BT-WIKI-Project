'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/lib/hooks/useUser';
import { HomepageFeed } from '@/components/homepage/HomepageFeed';
import { UserHomepage } from '@/components/homepage/UserHomepage';

export default function HomePage(): React.JSX.Element {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user?.role === 'Admin') {
      router.replace('/admin');
    }
  }, [user, loading, router]);

  if (loading || user?.role === 'Admin') {
    return (
      <div className="p-8 flex justify-center items-center">
        <div className="text-brand-textSecondary">Loading...</div>
      </div>
    );
  }

  if (user?.role === 'User') {
    return <UserHomepage />;
  }

  return <HomepageFeed />;
}
