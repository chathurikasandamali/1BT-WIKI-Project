'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { SpinnerIcon } from '@/components/shared/icons/SpinnerIcon';
import { ChevronDownIcon } from '@/components/shared/icons/ChevronDownIcon';
import { formatDate } from '@/lib/utils/date';
import { UserRoleValue } from '@repo/shared';
import type { UserRole } from '@repo/shared';
import { SortableHeader, SortDirection } from '@/components/admin/SortableHeader';

/** Column keys the admin user table can sort by. */
export type UserSortField = 'name' | 'role' | 'createdAt' | 'status';

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
  sortField: UserSortField;
  sortDir: SortDirection;
  onSort: (field: UserSortField) => void;
  onRoleChange: (userId: string, role: UserRole) => void;
  onBanToggle: (user: AdminUser) => void;
}

const ROLES: UserRole[] = [UserRoleValue.Admin, UserRoleValue.Reviewer, UserRoleValue.User];

const roleBadgeClass: Record<UserRole, string> = {
  Admin: 'bg-brand-red/10 text-brand-red border-brand-red/20',
  Reviewer: 'bg-amber-50 text-amber-700 border-amber-200',
  User: 'bg-brand-bg text-brand-text-secondary border-brand-border',
};

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  Admin: 'Full platform access',
  Reviewer: 'Can approve submissions',
  User: 'Standard member access',
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
        className="h-9 w-9 flex-shrink-0 rounded-full border border-brand-border object-cover"
        onError={() => setImgFailed(true)}
      />
    );
  }
  return (
    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-brand-border bg-brand-bg text-xs font-semibold text-brand-text-secondary">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

interface RoleDropdownProps {
  userId: string;
  value: UserRole;
  disabled: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onChange: (role: UserRole) => void;
}

/**
 * Theme-matched role picker. Opens a menu from the current role badge.
 */
function RoleDropdown({
  userId,
  value,
  disabled,
  isOpen,
  onToggle,
  onClose,
  onChange,
}: RoleDropdownProps): React.JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  useEffect(() => {
    if (!isOpen || !rootRef.current) {
      setMenuPosition(null);
      return;
    }

    const rect = rootRef.current.getBoundingClientRect();
    setMenuPosition({
      top: rect.bottom + 8,
      left: rect.left,
    });

    const handlePointerDown = (event: MouseEvent): void => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      onClose();
    };

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const handleReposition = (): void => {
      if (!rootRef.current) {
        return;
      }
      const nextRect = rootRef.current.getBoundingClientRect();
      setMenuPosition({
        top: nextRect.bottom + 8,
        left: nextRect.left,
      });
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [isOpen, onClose]);

  const menu =
    isOpen && menuPosition ? (
      <div
        ref={menuRef}
        role="listbox"
        aria-label="Select user role"
        style={{ top: menuPosition.top, left: menuPosition.left }}
        className="fixed z-50 w-52 overflow-hidden rounded border border-brand-border bg-brand-surface py-1 shadow-lg"
      >
        {ROLES.map((role) => {
          const isSelected = role === value;
          return (
            <button
              key={role}
              type="button"
              role="option"
              aria-selected={isSelected}
              data-testid={`role-option-${userId}-${role}`}
              onClick={() => {
                if (!isSelected) {
                  onChange(role);
                }
                onClose();
              }}
              className={cn(
                'flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left transition-colors hover:bg-brand-hover',
                isSelected && 'bg-brand-bg'
              )}
            >
              <span
                className={cn(
                  'inline-flex rounded-full border px-2 py-0.5 text-xs font-medium',
                  roleBadgeClass[role]
                )}
              >
                {role}
              </span>
              <span className="text-[11px] text-brand-text-secondary">
                {ROLE_DESCRIPTIONS[role]}
              </span>
            </button>
          );
        })}
      </div>
    ) : null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        data-testid={`role-select-${userId}`}
        onClick={onToggle}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red/30',
          'disabled:cursor-not-allowed disabled:opacity-60',
          roleBadgeClass[value]
        )}
      >
        {value}
        <ChevronDownIcon
          className={cn(
            'h-3.5 w-3.5 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>
      {menu && createPortal(menu, document.body)}
    </div>
  );
}

export function UserManagementTable({
  users,
  updatingUserId,
  sortField,
  sortDir,
  onSort,
  onRoleChange,
  onBanToggle,
}: UserManagementTableProps): React.JSX.Element {
  const [openRoleUserId, setOpenRoleUserId] = useState<string | null>(null);

  if (users.length === 0) {
    return (
      <div
        className="py-16 text-center text-sm text-brand-text-secondary"
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
          <tr className="border-b border-brand-border bg-brand-bg/40">
            <SortableHeader
              label="User"
              field="name"
              activeField={sortField}
              dir={sortDir}
              onSort={onSort}
            />
            <SortableHeader
              label="Role"
              field="role"
              activeField={sortField}
              dir={sortDir}
              onSort={onSort}
            />
            <SortableHeader
              label="Status"
              field="status"
              activeField={sortField}
              dir={sortDir}
              onSort={onSort}
              className="hidden md:table-cell"
            />
            <SortableHeader
              label="Joined"
              field="createdAt"
              activeField={sortField}
              dir={sortDir}
              onSort={onSort}
              className="hidden lg:table-cell"
            />
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-brand-text-secondary">
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
                  'user-row transition-colors hover:bg-brand-hover',
                  isBanned && 'opacity-60'
                )}
                data-testid={`user-row-${user.id}`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <UserInitialAvatar name={user.name} image={user.image} />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-brand-text-primary">
                        {user.name}
                      </p>
                      <p className="truncate text-xs text-brand-text-secondary">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </td>

                <td className="relative px-4 py-3">
                  <RoleDropdown
                    userId={user.id}
                    value={user.role}
                    disabled={isUpdating}
                    isOpen={openRoleUserId === user.id}
                    onToggle={() =>
                      setOpenRoleUserId((current) =>
                        current === user.id ? null : user.id
                      )
                    }
                    onClose={() => setOpenRoleUserId(null)}
                    onChange={(role) => onRoleChange(user.id, role)}
                  />
                </td>

                <td className="hidden px-4 py-3 md:table-cell">
                  {isBanned && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full border border-brand-red/20 bg-brand-red/10 px-2 py-0.5 text-xs font-medium text-brand-red"
                      title={user.banReason ?? undefined}
                      data-testid={`status-badge-${user.id}`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-red" />
                      Deactivated
                    </span>
                  )}
                  {!isBanned && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700"
                      data-testid={`status-badge-${user.id}`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      Active
                    </span>
                  )}
                </td>

                <td className="hidden px-4 py-3 text-brand-text-secondary lg:table-cell">
                  {formatDate(user.createdAt)}
                </td>

                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onBanToggle(user)}
                    disabled={isUpdating}
                    data-testid={`ban-toggle-btn-${user.id}`}
                    className={cn(
                      'rounded border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                      isBanned
                        ? 'border-green-200 text-green-700 hover:bg-green-50'
                        : 'border-brand-red/20 text-brand-red hover:bg-brand-red/5'
                    )}
                  >
                    {isUpdating && (
                      <span className="inline-flex items-center gap-1.5">
                        <SpinnerIcon className="h-3 w-3 animate-spin" />
                        Saving...
                      </span>
                    )}
                    {!isUpdating && (isBanned ? 'Activate' : 'Deactivate')}
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
