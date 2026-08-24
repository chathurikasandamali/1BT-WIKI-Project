'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { SpinnerIcon } from '@/components/shared/icons/SpinnerIcon';
import { formatDate } from '@/lib/utils/date';

export type UserRole = 'Admin' | 'Reviewer' | 'User';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  banned: boolean | null;
  banReason: string | null;
  image: string | null;
  createdAt: string;
}

interface UserManagementTableProps {
  users: AdminUser[];
  updatingUserId: string | null;
  onRoleChange: (userId: string, role: UserRole) => void;
  onBanToggle: (user: AdminUser) => void;
}

const ROLES: UserRole[] = ['Admin', 'Reviewer', 'User'];

const roleBadgeClass: Record<UserRole, string> = {
  Admin: 'bg-brand-red/10 text-brand-red border-brand-red/20',
  Reviewer: 'bg-amber-50 text-amber-700 border-amber-200',
  User: 'bg-brand-bg text-brand-text-secondary border-brand-border',
};

function UserInitialAvatar({
  name,
  image,
}: {
  name: string;
  image: string | null;
}) {
  const [imgFailed, setImgFailed] = React.useState(false);
  const src = image && image.trim().length > 0 ? image : null;

  if (src && !imgFailed) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={src}
        alt={name}
        className="w-8 h-8 rounded-full object-cover border border-brand-border flex-shrink-0"
        onError={() => setImgFailed(true)}
      />
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-brand-bg border border-brand-border flex items-center justify-center text-xs font-semibold text-brand-text-secondary flex-shrink-0">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export function UserManagementTable({
  users,
  updatingUserId,
  onRoleChange,
  onBanToggle,
}: UserManagementTableProps): React.JSX.Element {
  if (users.length === 0) {
    return (
      <div
        className="py-16 text-center text-brand-text-secondary text-sm"
        data-testid="empty-users"
      >
        No users found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto" data-testid="user-management-table">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-brand-border bg-brand-bg/60">
            <th className="text-left px-4 py-3 text-xs font-semibold text-brand-text-secondary uppercase tracking-wider">
              User
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-brand-text-secondary uppercase tracking-wider">
              Role
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-brand-text-secondary uppercase tracking-wider hidden md:table-cell">
              Status
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-brand-text-secondary uppercase tracking-wider hidden lg:table-cell">
              Joined
            </th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-brand-text-secondary uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-brand-border">
          {users.map((user) => {
            const isBanned = user.banned === true;
            const isUpdating = updatingUserId === user.id;

            return (
              <tr
                key={user.id}
                className={cn(
                  'user-row transition-colors hover:bg-brand-bg/50',
                  isBanned && 'opacity-60'
                )}
                data-testid={`user-row-${user.id}`}
              >
                {/* User info */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <UserInitialAvatar name={user.name} image={user.image} />
                    <div className="min-w-0">
                      <p className="font-medium text-brand-text-primary truncate">
                        {user.name}
                      </p>
                      <p className="text-xs text-brand-text-secondary truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Role dropdown */}
                <td className="px-4 py-3">
                  <select
                    value={user.role}
                    disabled={isUpdating}
                    data-testid={`role-select-${user.id}`}
                    onChange={(e) =>
                      onRoleChange(user.id, e.target.value as UserRole)
                    }
                    className={cn(
                      'text-xs font-medium border rounded px-2 py-1 pr-6 cursor-pointer focus:outline-none focus:border-brand-red transition-colors appearance-none bg-no-repeat disabled:cursor-not-allowed disabled:opacity-60',
                      roleBadgeClass[user.role]
                    )}
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                      backgroundPosition: 'right 4px center',
                      backgroundSize: '12px',
                    }}
                  >
                    {ROLES.map((r) => (
                      <option
                        key={r}
                        value={r}
                        className="text-brand-text-primary bg-brand-surface"
                      >
                        {r}
                      </option>
                    ))}
                  </select>
                </td>

                {/* Status badge */}
                <td className="px-4 py-3 hidden md:table-cell">
                  {isBanned ? (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-brand-red/10 text-brand-red border border-brand-red/20"
                      title={user.banReason ?? undefined}
                      data-testid={`status-badge-${user.id}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-red" />
                      Deactivated
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-50 text-green-700 border border-green-200"
                      data-testid={`status-badge-${user.id}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      Active
                    </span>
                  )}
                </td>

                {/* Joined */}
                <td className="px-4 py-3 text-brand-text-secondary hidden lg:table-cell">
                  {formatDate(user.createdAt)}
                </td>

                {/* Actions */}
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onBanToggle(user)}
                    disabled={isUpdating}
                    data-testid={`ban-toggle-btn-${user.id}`}
                    className={cn(
                      'text-xs font-medium px-3 py-1.5 rounded border transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                      isBanned
                        ? 'border-green-200 text-green-700 hover:bg-green-50'
                        : 'border-brand-red/20 text-brand-red hover:bg-brand-red/5'
                    )}
                  >
                    {isUpdating && (
                      <span className="inline-flex items-center gap-1.5">
                        <SpinnerIcon className="w-3 h-3 animate-spin" />
                        Saving...
                      </span>
                    )}
                    {!isUpdating && (isBanned ? 'Reactivate' : 'Deactivate')}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
