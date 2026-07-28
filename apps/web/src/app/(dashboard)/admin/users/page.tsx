'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { apiFetch } from '@/lib/api/client';
import { UserManagementTable } from '@/app/(dashboard)/admin/users/UserManagementTable';
import { BanModal } from '@/app/(dashboard)/admin/users/BanModal';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import type {
  AdminUser,
  UserRole,
} from '@/app/(dashboard)/admin/users/UserManagementTable';
import { cn } from '@/lib/utils';

gsap.registerPlugin(useGSAP);

// ── Internal types ────────────────────────────────────────────────────────────

type SortField = 'name' | 'role' | 'createdAt' | 'status';
type SortDir = 'asc' | 'desc';

import { RefreshIcon } from '@/components/shared/icons/RefreshIcon';
import { SearchIcon } from '@/components/shared/icons/SearchIcon';
import { ChevronUpIcon } from '@/components/shared/icons/ChevronUpIcon';

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <ChevronUpIcon
      className={cn(
        'w-3.5 h-3.5 transition-transform',
        active ? 'text-brand-red' : 'text-brand-text-secondary/40',
        active && dir === 'desc' && 'rotate-180'
      )}
    />
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function UserManagementContent(): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<UserRole | 'All'>('All');
  const [filterStatus, setFilterStatus] = useState<
    'All' | 'Active' | 'Deactivated'
  >('All');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Ban modal state
  const [modalTarget, setModalTarget] = useState<AdminUser | null>(null);

  // ── Fetch users ─────────────────────────────────────────────────────────────

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

  // ── GSAP entrance animation ─────────────────────────────────────────────────

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

  // ── Sorting ─────────────────────────────────────────────────────────────────

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  // ── Derived list ────────────────────────────────────────────────────────────

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

  // ── Counts for summary ──────────────────────────────────────────────────────

  const totalActive = users.filter((u) => !u.banned).length;
  const totalBanned = users.filter((u) => u.banned === true).length;
  const totalAdmins = users.filter((u) => u.role === 'Admin').length;

  // ── Role update ─────────────────────────────────────────────────────────────

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

  // ── Ban toggle via modal ────────────────────────────────────────────────────

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

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-6xl mx-auto" ref={containerRef}>
      {/* Page Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-brand-text-primary">
            User Management
          </h1>
          <p className="mt-1 text-sm text-brand-text-secondary">
            Manage roles and access for all platform users.
          </p>
        </div>
        <button
          type="button"
          onClick={loadUsers}
          data-testid="refresh-btn"
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-brand-border text-brand-text-secondary hover:bg-brand-hover rounded transition-colors disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshIcon className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Summary Stats */}
      {!loading && !error && (
        <div className="page-header grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            {
              label: 'Total Users',
              value: users.length,
              color: 'text-brand-text-primary',
            },
            { label: 'Active', value: totalActive, color: 'text-green-600' },
            {
              label: 'Deactivated',
              value: totalBanned,
              color: 'text-brand-red',
            },
            { label: 'Admins', value: totalAdmins, color: 'text-amber-600' },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="bg-brand-surface border border-brand-border rounded shadow-sm px-4 py-3"
            >
              <p className="text-xs font-medium text-brand-text-secondary uppercase tracking-wider mb-1">
                {label}
              </p>
              <p className={cn('text-2xl font-bold', color)}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Global error banner */}
      {error && (
        <div
          className="mb-6 p-4 bg-brand-red/10 border border-brand-red/20 rounded text-brand-red text-sm flex items-center justify-between"
          data-testid="error-banner"
        >
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-4 text-brand-red hover:text-brand-red-hover text-lg leading-none"
          >
            ×
          </button>
        </div>
      )}

      {/* Table Card */}
      <div className="table-card bg-brand-surface border border-brand-border rounded shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-brand-border flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-brand-bg/40">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <SearchIcon className="w-4 h-4 text-brand-text-secondary" />
            </span>
            <input
              type="search"
              placeholder="Search name or email…"
              data-testid="user-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-brand-surface border border-brand-border rounded focus:outline-none focus:border-brand-red transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Role filter */}
            <select
              value={filterRole}
              onChange={(e) =>
                setFilterRole(e.target.value as UserRole | 'All')
              }
              data-testid="role-filter-select"
              className="text-xs font-medium px-3 py-2 bg-brand-surface border border-brand-border rounded text-brand-text-secondary focus:outline-none focus:border-brand-red transition-colors cursor-pointer"
            >
              <option value="All">All Roles</option>
              <option value="Admin">Admin</option>
              <option value="Reviewer">Reviewer</option>
              <option value="User">User</option>
            </select>

            {/* Status filter */}
            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(
                  e.target.value as 'All' | 'Active' | 'Deactivated'
                )
              }
              data-testid="status-filter-select"
              className="text-xs font-medium px-3 py-2 bg-brand-surface border border-brand-border rounded text-brand-text-secondary focus:outline-none focus:border-brand-red transition-colors cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Deactivated">Deactivated</option>
            </select>

            {/* Sort controls */}
            <div className="flex items-center gap-1 border border-brand-border rounded overflow-hidden bg-brand-surface">
              {(['name', 'role', 'status', 'createdAt'] as SortField[]).map(
                (f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => toggleSort(f)}
                    data-testid={`sort-btn-${f}`}
                    className={cn(
                      'flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors capitalize',
                      sortField === f
                        ? 'bg-brand-red/8 text-brand-red'
                        : 'text-brand-text-secondary hover:bg-brand-bg'
                    )}
                  >
                    {f === 'createdAt' ? 'Joined' : f}
                    <SortIcon active={sortField === f} dir={sortDir} />
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        {/* Table body */}
        {loading ? (
          <div
            className="py-20 flex flex-col items-center justify-center gap-3"
            data-testid="loading-state"
          >
            <div className="w-6 h-6 border-2 border-brand-border border-t-brand-red rounded-full animate-spin" />
            <p className="text-sm text-brand-text-secondary">Loading users…</p>
          </div>
        ) : (
          <>
            <UserManagementTable
              users={displayedUsers}
              updatingUserId={updatingId}
              onRoleChange={handleRoleChange}
              onBanToggle={(user) => setModalTarget(user)}
            />
            {displayedUsers.length > 0 && (
              <div className="px-4 py-3 border-t border-brand-border text-xs text-brand-text-secondary bg-brand-bg/40">
                Showing {displayedUsers.length} of {users.length} user
                {users.length !== 1 ? 's' : ''}
              </div>
            )}
          </>
        )}
      </div>

      {/* Ban / Unban modal */}
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

// ── Page export (wrapped in RoleGuard) ────────────────────────────────────────

export default function AdminUsersPage(): React.JSX.Element {
  return (
    <RoleGuard allowedRoles={['Admin']}>
      <UserManagementContent />
    </RoleGuard>
  );
}
