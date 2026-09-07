'use client';

import React from 'react';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { AdminDashboard } from '@/components/admin/AdminDashboard';

export default function AdminDashboardPage(): React.JSX.Element {
  return (
    <RoleGuard allowedRoles={['Admin']}>
      <AdminDashboard />
    </RoleGuard>
  );
}
