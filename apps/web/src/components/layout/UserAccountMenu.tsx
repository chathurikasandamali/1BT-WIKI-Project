'use client';

import React, { useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/lib/hooks/useUser';
import { authClient } from '@/lib/auth/client';
import { UserAvatar } from '@/components/UserAvatar';
import { ChevronDownIcon } from '@/components/shared/icons/ChevronDownIcon';
import { ArticleIcon } from '@/components/shared/icons/ArticleIcon';
import { SettingsIcon } from '@/components/shared/icons/SettingsIcon';
import { LogoutIcon } from '@/components/shared/icons/LogoutIcon';
import { UsersIcon } from '@/components/shared/icons/UsersIcon';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UserAccountMenuProps {
  /** Whether the dropdown panel is currently visible. */
  isOpen: boolean;
  /** Called when the trigger button is clicked (toggle). */
  onToggle: () => void;
  /** Called when the menu should close (outside click, Escape, item selection). */
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Shared menu item base styles
// ---------------------------------------------------------------------------

const ITEM_BASE =
  'flex w-full items-center gap-2.5 px-3 py-2 text-sm text-brand-text-primary rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * UserAccountMenu
 *
 * A controlled dropdown triggered by the avatar + chevron button in the Navbar.
 * State is owned by Navbar so it can coordinate mutual exclusion with the
 * notification dropdown. This component handles:
 *   - Rendering the trigger button
 *   - Rendering the dropdown panel
 *   - Outside-click detection (calls onClose)
 *   - Escape key handling (calls onClose and returns focus to trigger)
 *   - Role-based visibility of the Admin Dashboard item
 */
export function UserAccountMenu({
  isOpen,
  onToggle,
  onClose,
}: UserAccountMenuProps): React.JSX.Element {
  const { user } = useUser();
  const router = useRouter();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // ----- Outside-click handler --------------------------------------------
  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInsideMenu = menuRef.current?.contains(target);
      const clickedTrigger = triggerRef.current?.contains(target);
      if (!clickedInsideMenu && !clickedTrigger) {
        onClose();
        // Do NOT steal focus — allow it to remain on the clicked target.
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [isOpen, onClose]);

  // ----- Escape handler ---------------------------------------------------
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        // Return focus to the trigger so keyboard users can continue.
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // ----- Sign-out ---------------------------------------------------------
  const handleSignOut = async () => {
    onClose();
    try {
      await authClient.signOut();
      window.location.assign('/signin');
    } catch (error) {
      console.error('Error during sign-out:', error);
    }
  };

  // ----- Navigation item click --------------------------------------------
  const handleNavigation = (href: string) => {
    onClose();
    router.push(href);
  };

  // ----- Role flags (named booleans — project rule) -----------------------
  const isAdmin = user?.role === 'Admin';

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div className="relative">
      {/* ---- Trigger: avatar + chevron ---- */}
      <button
        ref={triggerRef}
        type="button"
        id="user-account-trigger"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-controls="user-account-menu"
        onClick={onToggle}
        className={cn(
          'flex items-center gap-2 rounded-lg px-2 py-1 transition-colors',
          'hover:bg-brand-hover',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red',
          isOpen && 'bg-brand-hover'
        )}
        data-testid="user-account-trigger"
      >
        <UserAvatar format="collapsed" />
        <ChevronDownIcon
          className={cn(
            'h-3 w-3 text-brand-text-secondary ml-1 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
          aria-hidden="true"
        />
      </button>

      {/* ---- Dropdown panel ---- */}
      {isOpen && (
        <div
          ref={menuRef}
          id="user-account-menu"
          role="navigation"
          aria-label="User account options"
          className={cn(
            'absolute right-0 top-full mt-2 z-50',
            'min-w-[200px]',
            'bg-white border border-brand-border rounded-lg shadow-lg',
            'py-1'
          )}
          data-testid="user-account-dropdown"
        >
          {/* User info header */}
          {user && (
            <div className="px-3 py-2 border-b border-brand-border mb-1">
              <p className="text-sm font-semibold text-brand-text-primary truncate">
                {user.name}
              </p>
              <p className="text-xs text-brand-text-secondary truncate">
                {user.email}
              </p>
            </div>
          )}

          {/* My Articles */}
          <button
            type="button"
            onClick={() => handleNavigation('/my-articles')}
            className={cn(ITEM_BASE, 'hover:bg-brand-hover mx-1 w-[calc(100%-0.5rem)]')}
            data-testid="menu-item-my-articles"
          >
            <ArticleIcon className="h-4 w-4 flex-shrink-0 text-brand-text-secondary" aria-hidden="true" />
            My Articles
          </button>

          {/* Settings */}
          <button
            type="button"
            onClick={() => handleNavigation('/settings')}
            className={cn(ITEM_BASE, 'hover:bg-brand-hover mx-1 w-[calc(100%-0.5rem)]')}
            data-testid="menu-item-settings"
          >
            <SettingsIcon className="h-4 w-4 flex-shrink-0 text-brand-text-secondary" aria-hidden="true" />
            Settings
          </button>

          {/* Admin Dashboard — admin only */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => handleNavigation('/admin')}
              className={cn(ITEM_BASE, 'hover:bg-brand-hover mx-1 w-[calc(100%-0.5rem)]')}
              data-testid="menu-item-admin"
            >
              <UsersIcon className="h-4 w-4 flex-shrink-0 text-brand-text-secondary" aria-hidden="true" />
              Admin Dashboard
            </button>
          )}

          {/* Divider */}
          <div className="border-t border-brand-border my-1" />

          {/* Sign Out */}
          <button
            type="button"
            onClick={handleSignOut}
            className={cn(
              ITEM_BASE,
              'hover:bg-red-50 mx-1 w-[calc(100%-0.5rem)]',
              'text-red-600 hover:text-red-700'
            )}
            data-testid="menu-item-sign-out"
          >
            <LogoutIcon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
