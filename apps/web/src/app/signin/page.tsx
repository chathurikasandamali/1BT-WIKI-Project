'use client';

import { Suspense } from 'react';
import { LandingPage } from '@/components/landing/LandingPage';
import { BRAND_FULL_NAME } from '@/lib/constants/brand';

export default function SignInPage(): React.JSX.Element {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-brand-bg px-4">
          <div className="flex items-center gap-3 text-brand-text-secondary">
            <span className="h-3 w-3 animate-pulse rounded-full bg-brand-red" />
            Loading {BRAND_FULL_NAME}...
          </div>
        </main>
      }
    >
      <LandingPage />
    </Suspense>
  );
}
