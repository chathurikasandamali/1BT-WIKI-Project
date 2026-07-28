'use client';

import React from 'react';
import Link from 'next/link';
import { useUser, UserRole } from '@/lib/hooks/useUser';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGuard({
  allowedRoles,
  children,
  fallback,
}: RoleGuardProps) {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center">
        <div className="text-brand-text-secondary">Loading...</div>
      </div>
    );
  }

  // user is null (not logged in, though middleware should catch this first)
  // or user's role is not in the allowed list
  if (!user || !allowedRoles.includes(user.role)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="p-8 flex flex-col justify-center items-center text-center bg-brand-bg min-h-[50vh]">
        <h2 className="text-xl font-bold mb-4 text-brand-text-primary">
          You don&apos;t have permission to view this page
        </h2>
        <Link
          href="/"
          data-testid="roleguard-home-link"
          className="text-brand-red hover:text-brand-red-hover underline font-medium"
        >
          Return to Homepage
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
