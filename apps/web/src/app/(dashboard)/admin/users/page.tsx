'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { apiFetch } from '@/lib/api/client';
import {
  UserManagementTable,
  type AdminUser,
  type UserSortField,
} from '@/app/(dashboard)/admin/users/UserManagementTable';
import { BanModal } from '@/app/(dashboard)/admin/users/BanModal';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { UserRoleValue } from '@repo/shared';
import type { UserRole } from '@repo/shared';
import { PageLoader } from '@/components/shared/PageLoader';
import { RefreshIcon } from '@/components/shared/icons/RefreshIcon';
import { DashboardWidget } from '@/components/admin/DashboardWidget';
import { UsersIcon } from '@/components/shared/icons/UsersIcon';
import { CheckCircleIcon } from '@/components/shared/icons/CheckCircleIcon';
import { BanIcon } from '@/components/shared/icons/BanIcon';
import { UserIcon } from '@/components/shared/icons/UserIcon';
import { SearchIcon } from '@/components/shared/icons/SearchIcon';
import { FilterChip } from '@/components/admin/FilterChip';
import type { SortDirection } from '@/components/admin/SortableHeader';

gsap.registerPlugin(useGSAP);

type StatusFilter = 'All' | 'Active' | 'Deactivated';

const ROLE_FILTERS: Array<UserRole | 'All'> = [
  'All',
  'Admin',
  'Reviewer',
  'User',
];
const STATUS_FILTERS: StatusFilter[] = ['All', 'Active', 'Deactivated'];

function UserManagementContent(): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<UserRole | 'All'>('All');
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('All');
  const [sortField, setSortField] = useState<UserSortField>('name');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [modalTarget, setModalTarget] = useState<AdminUser | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<AdminUser[]>('/admin/getAllUsers');
      if (res.success && res.data) {
        setUsers(res.data);
      } else {
        setError(res.error ?? 'Failed to load users.');
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useGSAP(
    () => {
      if (!loading && !error && containerRef.current) {
        gsap.fromTo(
          '.page-header',
          { y: -10, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.4, ease: 'power2.out' }
        );
        gsap.fromTo(
          '.table-card',
          { y: 14, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.45, ease: 'power2.out', delay: 0.08 }
        );
        gsap.fromTo(
          '.user-row',
          { x: -8, opacity: 0 },
          {
            x: 0,
            opacity: 1,
            duration: 0.3,
            stagger: 0.04,
            ease: 'power2.out',
            delay: 0.18,
          }
        );
      }
    },
    { scope: containerRef, dependencies: [loading, error] }
  );

  const toggleSort = (field: UserSortField): void => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const displayedUsers = users
    .filter((u) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q);
      const matchesRole = filterRole === 'All' || u.role === filterRole;
      const matchesStatus =
        filterStatus === 'All' ||
        (filterStatus === 'Active' && !u.banned) ||
        (filterStatus === 'Deactivated' && u.banned === true);
      return matchesSearch && matchesRole && matchesStatus;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      if (sortField === 'role') cmp = a.role.localeCompare(b.role);
      if (sortField === 'createdAt')
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortField === 'status')
        cmp = Number(a.banned ?? false) - Number(b.banned ?? false);
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const totalActive = users.filter((u) => !u.banned).length;
  const totalBanned = users.filter((u) => u.banned === true).length;
  const totalAdmins = users.filter((u) => u.role === UserRoleValue.Admin).length;

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setUpdatingId(userId);
    try {
      const res = await apiFetch(`/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });
      if (res.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        );
      } else {
        setError(res.error ?? 'Failed to update role.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleBanConfirm = async (banReason?: string) => {
    if (!modalTarget) return;
    const isBanned = modalTarget.banned === true;
    setUpdatingId(modalTarget.id);
    setModalTarget(null);
    try {
      const body = isBanned ? { banned: false } : { banned: true, banReason };
      const res = await apiFetch(`/admin/users/${modalTarget.id}/ban`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      if (res.success) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === modalTarget.id
              ? {
                  ...u,
                  banned: !isBanned,
                  banReason: isBanned ? null : (banReason ?? null),
                }
              : u
          )
        );
      } else {
        setError(res.error ?? 'Failed to update user status.');
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update user status.'
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const isInitialLoad = loading && users.length === 0 && !error;

  if (isInitialLoad) {
    return <PageLoader testId="loading-state" message="Loading users" />;
  }

  return (
    <div className="mx-auto max-w-6xl p-8" ref={containerRef}>
      <div className="page-header mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-brand-text-primary">
            User Management
          </h1>
          <p className="mt-1 text-sm text-brand-text-secondary">
            Manage roles and access for all registered accounts.
          </p>
        </div>
        <button
          type="button"
          onClick={loadUsers}
          data-testid="refresh-btn"
          disabled={loading}
          className="flex items-center gap-2 self-start rounded border border-brand-border px-4 py-2 text-sm font-medium text-brand-text-secondary transition-colors hover:bg-brand-hover disabled:opacity-50 sm:self-auto"
        >
          <RefreshIcon className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div
          className="mb-6 flex items-center justify-between rounded border border-brand-red/20 bg-brand-red/10 p-4 text-sm text-brand-red"
          data-testid="error-banner"
        >
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-4 text-lg leading-none text-brand-red hover:text-brand-red-hover"
          >
            ×
          </button>
        </div>
      )}

      {!error && (
        <div className="page-header mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardWidget
            label="Total Users"
            description="Everyone registered on the wiki"
            value={users.length}
            onClick={() => {
              setFilterRole('All');
              setFilterStatus('All');
            }}
            selected={filterRole === 'All' && filterStatus === 'All'}
            icon={<UsersIcon className="h-4 w-4" />}
            borderClassName="border-brand-border"
            testId="widget-total-users"
          />
          <DashboardWidget
            label="Active"
            description="Accounts that can sign in"
            value={totalActive}
            onClick={() => {
              setFilterRole('All');
              setFilterStatus('Active');
            }}
            selected={filterStatus === 'Active' && filterRole === 'All'}
            icon={<CheckCircleIcon className="h-4 w-4" />}
            valueClassName="text-green-600"
            iconClassName="bg-green-50 text-green-700"
            borderClassName="border-green-200"
            testId="widget-active-users"
          />
          <DashboardWidget
            label="Deactivated"
            description="Accounts currently blocked"
            value={totalBanned}
            onClick={() => {
              setFilterRole('All');
              setFilterStatus('Deactivated');
            }}
            selected={filterStatus === 'Deactivated' && filterRole === 'All'}
            icon={<BanIcon className="h-4 w-4" />}
            valueClassName="text-brand-red"
            iconClassName="bg-brand-red/10 text-brand-red"
            borderClassName="border-brand-red/25"
            testId="widget-deactivated-users"
          />
          <DashboardWidget
            label="Admins"
            description="Users with admin privileges"
            value={totalAdmins}
            onClick={() => {
              setFilterRole('Admin');
              setFilterStatus('All');
            }}
            selected={filterRole === 'Admin' && filterStatus === 'All'}
            icon={<UserIcon className="h-4 w-4" />}
            valueClassName="text-amber-600"
            iconClassName="bg-amber-50 text-amber-700"
            borderClassName="border-amber-200"
            testId="widget-admin-users"
          />
        </div>
      )}

      <section
        className="table-card overflow-visible rounded border border-brand-border bg-brand-surface shadow-sm"
        data-testid="user-management-section"
      >
        <div className="border-b border-brand-border bg-brand-bg/40 px-4 py-4">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-brand-text-primary">
              Registered users
            </h2>
            <p className="mt-0.5 text-xs text-brand-text-secondary">
              Search, filter, and update roles or access for each account.
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                <SearchIcon className="h-4 w-4 text-brand-text-secondary" />
              </span>
              <input
                type="search"
                placeholder="Search by name or email"
                data-testid="user-search-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded border border-brand-border bg-brand-surface py-2.5 pl-9 pr-3 text-sm text-brand-text-primary transition-colors placeholder:text-brand-text-secondary focus:border-brand-red focus:outline-none"
              />
            </div>

            <div
              className="flex flex-wrap items-center gap-1.5"
              data-testid="role-filter-select"
            >
              {ROLE_FILTERS.map((role) => (
                <FilterChip
                  key={role}
                  label={role === 'All' ? 'All roles' : role}
                  selected={filterRole === role}
                  onClick={() => setFilterRole(role)}
                />
              ))}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5" data-testid="status-filter-select">
            {STATUS_FILTERS.map((status) => (
              <FilterChip
                key={status}
                label={status === 'All' ? 'All statuses' : status}
                selected={filterStatus === status}
                onClick={() => setFilterStatus(status)}
              />
            ))}
          </div>
        </div>

        {loading ? (
          <PageLoader
            testId="loading-state"
            message="Loading users"
            className="min-h-0 py-20"
          />
        ) : (
          <>
            <UserManagementTable
              users={displayedUsers}
              updatingUserId={updatingId}
              sortField={sortField}
              sortDir={sortDir}
              onSort={toggleSort}
              onRoleChange={handleRoleChange}
              onBanToggle={(user) => setModalTarget(user)}
            />
            {displayedUsers.length > 0 && (
              <div className="border-t border-brand-border bg-brand-bg/40 px-4 py-3 text-xs text-brand-text-secondary">
                Showing {displayedUsers.length} of {users.length} user
                {users.length !== 1 ? 's' : ''}
              </div>
            )}
          </>
        )}
      </section>

      {modalTarget && (
        <BanModal
          userName={modalTarget.name}
          isBanned={modalTarget.banned === true}
          onConfirm={handleBanConfirm}
          onCancel={() => setModalTarget(null)}
        />
      )}
    </div>
  );
}

export default function AdminUsersPage(): React.JSX.Element {
  return (
    <RoleGuard allowedRoles={[UserRoleValue.Admin]}>
      <UserManagementContent />
    </RoleGuard>
  );
}
