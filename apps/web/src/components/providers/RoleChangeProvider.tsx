'use client';

// apps/web/src/components/providers/RoleChangeProvider.tsx
//
// Mounts the role-change logout listener for the authenticated user.
// Responsibilities are cleanly separated from notifications:
//   - NotificationProvider  → notification state + notification:new
//   - RoleChangeProvider    → role-changed automatic sign-out
//
// Placement in the tree:
//   <UserProvider>            ← provides user.id via useUser()
//     <RoleChangeProvider>      ← listens for role-changed
//       <NotificationProvider>
//         ... rest of app
//       </NotificationProvider>
//     </RoleChangeProvider>
//   </UserProvider>

import React from 'react';
import { useUser } from '@/lib/hooks/useUser';
import { useRoleChangeLogout } from '@/lib/hooks/useRoleChangeLogout';

interface RoleChangeProviderProps {
  children: React.ReactNode;
}

/**
 * Automatically signs the user out across all open tabs when an Admin changes
 * their role. Must be rendered inside <UserProvider> so it can read the
 * authenticated user's ID to build the Pusher private channel name.
 */
export function RoleChangeProvider({
  children,
}: RoleChangeProviderProps): React.JSX.Element {
  const { user } = useUser();

  useRoleChangeLogout(user?.id ?? null);

  return <>{children}</>;
}