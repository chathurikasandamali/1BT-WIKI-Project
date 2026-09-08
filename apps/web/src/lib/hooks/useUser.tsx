'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api/client';
import type { UserRole } from '@repo/shared';

/** Matches the GET /api/v1/users/me response shape (UserProfile from the backend). */
export interface UserMeData {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

interface UserContextValue {
  user: UserMeData | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const UserContext = createContext<UserContextValue | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface UserProviderProps {
  children: React.ReactNode;
}

/**
 * Fetches the authenticated user's profile exactly once on mount and shares
 * the result via React Context. Mount this once in a layout that wraps all
 * components needing user data (e.g. DashboardLayout).
 */
export function UserProvider({ children }: UserProviderProps) {
  const [user, setUser] = useState<UserMeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUser = async () => {
    setLoading(true);
    try {
      const result = await apiFetch<UserMeData>('/users/me');
      if (result.success && result.data) {
        setUser(result.data);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[UserProvider] Failed to fetch user profile:', message);
      setError(err instanceof Error ? err : new Error(message));
      // user stays null → consumers fall back to Guest / unauthenticated state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <UserContext.Provider value={{ user, loading, error, refetch: fetchUser }}>
      {children}
    </UserContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Read the current user from UserContext.
 *
 * @throws Error if called outside a <UserProvider> — catches misuse early
 *         during development rather than silently returning undefined.
 */
export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (ctx === undefined) {
    throw new Error('useUser() must be used within a <UserProvider>');
  }
  return ctx;
}
