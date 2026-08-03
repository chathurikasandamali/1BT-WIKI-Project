/* eslint-disable @next/next/no-img-element */

'use client';
import { useState } from 'react';
import { useUser } from '@/lib/hooks/useUser';

interface UserAvatarProps {
  format?: 'collapsed' | 'expanded' | 'detail';
  name?: string;
  avatarUrl?: string | null;
}

export const UserAvatar = ({ format = 'collapsed', name, avatarUrl }: UserAvatarProps) => {
  const { user } = useUser();
  const [imageError, setImageError] = useState(false);

  const effectiveName = name ?? user?.name ?? 'Guest';
  const effectiveAvatarUrl = avatarUrl !== undefined ? avatarUrl : user?.avatarUrl;

  const initials = (effectiveName || 'Author')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  const hasValidImage = Boolean(effectiveAvatarUrl) && !imageError;
  const isGuestWithoutUser = !name && avatarUrl === undefined && !user;

  if (isGuestWithoutUser) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-gray-300"></div>
        <span className="text-sm font-medium text-gray-700">Guest</span>
      </div>
    );
  }

  const avatarSizeClasses =
    format === 'detail' ? 'h-12 w-12 text-base' : 'h-8 w-8 text-sm';

  const avatarCircle = (
    <div className={`relative rounded-full ${avatarSizeClasses}`}>
      {hasValidImage ? (
        <img
          src={effectiveAvatarUrl!}
          alt={effectiveName}
          className={`rounded-full object-cover ${avatarSizeClasses}`}
          referrerPolicy="no-referrer"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className={`flex h-full w-full items-center justify-center rounded-full bg-gray-500 font-semibold text-white ${avatarSizeClasses}`}>
          {initials}
        </div>
      )}
    </div>
  );

  if (format === 'expanded') {
    return (
      <div className="flex items-center gap-2">
        {avatarCircle}
        <div className="flex flex-col">
          <span className="text-xs font-medium text-gray-400">
            {effectiveName}
          </span>
          {user?.role && (
            <span className="text-xs font-medium text-gray-500">
              {user.role}
            </span>
          )}
        </div>
      </div>
    );
  }

  return avatarCircle;
};
