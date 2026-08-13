'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { XCircleSolidIcon } from '@/components/shared/icons/XCircleSolidIcon';
import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { PreviewExperience } from '@/components/landing/PreviewExperience';
import {
  findFirstPreview,
  findPreviewByQuery,
  type PreviewKind,
} from '@/components/landing/previewContent';
import { authClient } from '@/lib/auth/client';
import { useLenisScroll } from '@/lib/hooks/useLenisScroll';
import { BRAND_NAME } from '@/lib/constants/brand';

export function LandingPage(): React.JSX.Element {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error');

  useLenisScroll();

  const handleAuthenticate = async () => {
    if (isAuthenticating) return;

    setIsAuthenticating(true);

    try {
      const { error } = await authClient.signIn.social({
        provider: 'google',
        callbackURL: '/signin/callback',
        errorCallbackURL: '/signin',
        disableRedirect: false,
      });

      if (!error) {
        router.push('/');
      } else {
        console.error('Google sign-in error:', error);
      }
    } catch (error) {
      console.error('Error during social sign-in:', error);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSelectKind = (kind: PreviewKind) => {
    setSelectedItemId(findFirstPreview(kind).id);
  };

  const handleSearch = (query: string): boolean => {
    const preview = findPreviewByQuery(query);

    if (!preview) return false;

    setSelectedItemId(preview.id);
    return true;
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text-primary">
      <LandingNavbar
        isAuthenticating={isAuthenticating}
        onAuthenticate={handleAuthenticate}
        onReset={() => setSelectedItemId(null)}
        onSearch={handleSearch}
        onSelectKind={handleSelectKind}
      />

      {errorParam && (
        <div className="relative z-40 mx-auto max-w-[1440px] px-5 pt-5 sm:px-8 lg:px-10">
          <div
            className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800"
            role="alert"
          >
            <XCircleSolidIcon className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <div>
              <p className="text-sm font-semibold">Access denied</p>
              <p className="mt-1 text-sm leading-6 text-red-700">
                Please sign in using your verified {BRAND_NAME} company email
                address.
              </p>
            </div>
          </div>
        </div>
      )}

      <PreviewExperience
        isAuthenticating={isAuthenticating}
        selectedItemId={selectedItemId}
        onAuthenticate={handleAuthenticate}
        onSelectItem={setSelectedItemId}
      />
    </div>
  );
}
