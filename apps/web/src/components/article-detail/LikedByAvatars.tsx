'use client';

import React, { useEffect, useRef, useState } from 'react';
import { fetchLikers, Liker } from '@/lib/api/likes';
import { UserAvatar } from '@/components/UserAvatar';

interface LikedByAvatarsProps {
  articleId: string;
  likeCount: number;
  likeToggle: boolean; // New prop to trigger re-fetching of likers 
}

const MAX_STACK_AVATARS = 3;

export function LikedByAvatars({ articleId, likeCount, likeToggle }: LikedByAvatarsProps) {
  const [likers, setLikers] = useState<Liker[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (likeCount === 0) return;

    let cancelled = false;
    fetchLikers(articleId)
      .then((result) => {
        if (!cancelled) setLikers(result);
      })
      .catch(() => {
        // Avatar stack is a non-critical enhancement; fail silently.
      });

    return () => {
      cancelled = true;
    };
  }, [articleId, likeCount, likeToggle]);

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const openPopover = () => {
    setIsOpen(true);
    fetchLikers(articleId)
      .then(setLikers)
      .catch(() => {
        // Keep showing the last known list if the refresh fails.
      });
  };

  if (likeCount === 0) return null;

  const stackLikers = likers.slice(0, MAX_STACK_AVATARS);
  const extraCount = likers.length - stackLikers.length;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={openPopover}
        data-testid="liked-by-trigger"
        aria-label="Show who liked this article"
        className="flex items-center -space-x-2 rounded-full hover:opacity-80 transition-opacity"
      >
        {stackLikers.map((liker) => (
          <div
            key={liker.id}
            className="ring-2 ring-white rounded-full"
            data-testid="liked-by-avatar"
          >
            <UserAvatar name={liker.userName} avatarUrl={liker.userImage} />
          </div>
        ))}
        {extraCount > 0 && (
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-border ring-2 ring-white text-xs font-semibold text-brand-text-secondary"
            data-testid="liked-by-extra-count"
          >
            +{extraCount}
          </div>
        )}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Liked by"
          data-testid="liked-by-popover"
          className="absolute right-0 top-full z-20 mt-2 w-64 max-h-80 overflow-y-auto rounded-lg border border-brand-border bg-white shadow-lg"
        >
          <div className="p-3 border-b border-brand-border text-xs font-semibold uppercase tracking-wide text-brand-text-secondary">
            Liked by
          </div>
          <div className="flex flex-col p-2">
            {likers.map((liker) => (
              <div
                key={liker.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-brand-hover"
                data-testid="liked-by-row"
              >
                <UserAvatar name={liker.userName} avatarUrl={liker.userImage} />
                <span className="text-sm font-medium text-brand-text-primary">
                  {liker.userName}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
