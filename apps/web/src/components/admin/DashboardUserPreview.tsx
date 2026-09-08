import React from 'react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils/date';
import type { DashboardUser } from '@/lib/api/adminDashboard';
import type { UserRole } from '@repo/shared';
import { DashboardPreviewTable } from '@/components/admin/DashboardPreviewTable';

const USER_HEADERS = ['User', 'Role', 'Status', 'Joined'] as const;

const roleBadgeClass: Record<UserRole, string> = {
  Admin: 'bg-brand-red/10 text-brand-red border-brand-red/20',
  Reviewer: 'bg-amber-50 text-amber-700 border-amber-200',
  User: 'bg-brand-bg text-brand-text-secondary border-brand-border',
};

interface DashboardUserPreviewProps {
  users: DashboardUser[];
  loading: boolean;
}

function UserInitialAvatar({
  name,
  image,
}: {
  name: string;
  image: string | null;
}): React.JSX.Element {
  const [imgFailed, setImgFailed] = React.useState(false);
  const src = image && image.trim().length > 0 ? image : null;

  if (src && !imgFailed) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={src}
        alt=""
        className="h-8 w-8 shrink-0 rounded-full border border-brand-border object-cover"
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-brand-border bg-brand-bg text-xs font-semibold text-brand-text-secondary">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

/**
 * Compact registered-user preview for Admin Home.
 */
export function DashboardUserPreview({
  users,
  loading,
}: DashboardUserPreviewProps): React.JSX.Element {
  return (
    <DashboardPreviewTable
      headers={USER_HEADERS}
      loading={loading}
      isEmpty={users.length === 0}
      emptyMessage="No users found."
      testId="dashboard-users-table"
    >
      {users.map((user) => {
        const isBanned = user.banned === true;

        return (
          <tr
            key={user.id}
            className="border-b border-brand-border last:border-b-0 transition-colors hover:bg-brand-hover"
            data-testid="dashboard-user-row"
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
            <td className="px-4 py-3">
              <span
                className={cn(
                  'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
                  roleBadgeClass[user.role] ?? roleBadgeClass.User
                )}
              >
                {user.role}
              </span>
            </td>
            <td className="px-4 py-3">
              {isBanned ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-brand-red/20 bg-brand-red/10 px-2 py-0.5 text-xs font-medium text-brand-red">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-red" />
                  Deactivated
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  Active
                </span>
              )}
            </td>
            <td className="px-4 py-3 text-brand-text-secondary">
              {formatDate(user.createdAt)}
            </td>
          </tr>
        );
      })}
    </DashboardPreviewTable>
  );
}
