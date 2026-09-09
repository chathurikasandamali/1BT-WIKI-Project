'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { XCircleSolidIcon } from '@/components/shared/icons/XCircleSolidIcon';
import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { PreviewExperience } from '@/components/landing/PreviewExperience';
import { authClient } from '@/lib/auth/client';
import { useLenisScroll } from '@/lib/hooks/useLenisScroll';
import { BRAND_NAME } from '@/lib/constants/brand';
import type { LandingAuthAction } from '@/components/landing/landingAuth';

export function LandingPage(): React.JSX.Element {
  const [authenticatingAction, setAuthenticatingAction] =
    useState<LandingAuthAction | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error');

  useLenisScroll();

  useEffect(() => {
    const { overflow: previousOverflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const handleAuthenticate = async (action: LandingAuthAction) => {
    if (authenticatingAction) return;

    setAuthenticatingAction(action);

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
      setAuthenticatingAction(null);
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-brand-bg text-brand-text-primary">
      <LandingNavbar
        authenticatingAction={authenticatingAction}
        onAuthenticate={handleAuthenticate}
        onReset={() => setSelectedItemId(null)}
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
        authenticatingAction={authenticatingAction}
        selectedItemId={selectedItemId}
        onAuthenticate={handleAuthenticate}
        onSelectItem={setSelectedItemId}
      />
    </div>
  );
}
