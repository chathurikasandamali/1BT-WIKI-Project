'use client';

import { authClient } from '@/lib/auth/client';
import { useEffect } from 'react';

export const dynamic = 'force-dynamic';

export default function SignInCallbackPage() {
  useEffect(() => {
    const handleSignInCallback = async () => {
      const { data: session } = await authClient.getSession();
      if (session?.user) {
        window.location.assign('/');
      } else {
        window.location.assign('/signin');
      }
    };
    handleSignInCallback();
  }, []); // Empty dependency array to run only once on mount
}
