'use client';

import React from 'react';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { UserRoleValue } from '@repo/shared';

export default function AdminDashboardPage(): React.JSX.Element {
  return (
    <RoleGuard allowedRoles={[UserRoleValue.Admin]}>
      <AdminDashboard />
    </RoleGuard>
  );
}
