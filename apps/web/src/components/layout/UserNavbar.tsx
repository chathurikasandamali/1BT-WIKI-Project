'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Plus, X } from 'lucide-react';
import { NotificationDropdown } from '@/components/layout/NotificationDropdown';
import { UserAccountMenu } from '@/components/layout/UserAccountMenu';
import { useNotificationContext } from '@/components/providers/NotificationProvider';
import { BellIcon } from '@/components/shared/icons/BellIcon';
import { SearchIcon } from '@/components/shared/icons/SearchIcon';
import { BRAND_NAME, BRAND_SUB_NAME } from '@/lib/constants/brand';
import { cn } from '@/lib/utils';

interface UserNavigationItem {
  label: string;
  href: string;
}

type OpenDropdown = 'notifications' | 'account' | null;

const USER_NAVIGATION_ITEMS: readonly UserNavigationItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Articles', href: '/articles' },
  { label: 'Tech Talks', href: '/tech-talks' },
  { label: 'Forum', href: '/forum' },
];


export function UserNavbar(): React.JSX.Element {
  const pathname = usePathname();
  const { unreadCount } = useNotificationContext();
  const [openDropdown, setOpenDropdown] = useState<OpenDropdown>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const notificationButtonRef = useRef<HTMLButtonElement>(null);
  const notificationDropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);

  const isNotificationOpen = openDropdown === 'notifications';
  const isAccountOpen = openDropdown === 'account';

  useEffect(() => {
    if (!isNotificationOpen) return;

    function handleMouseDown(event: MouseEvent): void {
      const target = event.target as Node;
      const clickedNotificationButton =
        notificationButtonRef.current?.contains(target);
      const clickedNotificationDropdown =
        notificationDropdownRef.current?.contains(target);

      if (!clickedNotificationButton && !clickedNotificationDropdown) {
        setOpenDropdown(null);
      }
    }

    function handleEscape(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setOpenDropdown(null);
        notificationButtonRef.current?.focus();
      }
    }

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isNotificationOpen]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    function handleEscape(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
        mobileMenuButtonRef.current?.focus();
      }
    }

    document.addEventListener('keydown', handleEscape);

    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMobileMenuOpen]);

  function isNavigationItemActive(href: string): boolean {
    if (href === '/') return pathname === '/';

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function closeMobileMenu(): void {
    setIsMobileMenuOpen(false);
  }

  function handleNotificationToggle(): void {
    setIsMobileMenuOpen(false);
    setOpenDropdown((current) =>
      current === 'notifications' ? null : 'notifications'
    );
  }

  function handleAccountToggle(): void {
    setIsMobileMenuOpen(false);
    setOpenDropdown((current) => (current === 'account' ? null : 'account'));
  }

  function handleMobileMenuToggle(): void {
    setOpenDropdown(null);
    setIsMobileMenuOpen((current) => !current);
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-brand-border bg-white">
      <div className="mx-auto flex h-20 w-full max-w-[1600px] items-center gap-3 px-4 sm:px-6 xl:gap-6 xl:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2"
          aria-label="1BT Wiki home"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-red text-xs font-black tracking-tight text-white shadow-[0_10px_28px_rgba(204,0,0,0.18)]">
            {BRAND_NAME}
          </span>
          <span className="font-display text-lg font-bold tracking-[-0.03em] text-brand-dark">
            {BRAND_SUB_NAME}
          </span>
        </Link>

        <nav
          className="hidden shrink-0 items-center gap-1 xl:flex"
          aria-label="Primary navigation"
        >
          {USER_NAVIGATION_ITEMS.map((item) => {
            const isActive = isNavigationItemActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'relative rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2',
                  isActive
                    ? 'text-brand-red after:absolute after:inset-x-3 after:-bottom-2 after:h-0.5 after:rounded-full after:bg-brand-red'
                    : 'text-brand-dark hover:bg-brand-hover'
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden min-w-0 flex-1 xl:block">
          <label
            className="relative mx-auto block max-w-xl"
            htmlFor="user-navbar-search"
          >
            <span className="sr-only">Search articles and tech talks</span>
            <SearchIcon
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-text-secondary"
              aria-hidden="true"
            />
            <input
              id="user-navbar-search"
              type="search"
              placeholder="Search articles and tech talks"
              className="h-11 w-full rounded-full border border-brand-border bg-brand-bg pl-11 pr-4 text-sm text-brand-text-primary placeholder:text-brand-text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red/30 focus-visible:border-brand-red"
            />
          </label>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Link
            href="/editor"
            aria-label="Create an Article"
            className="hidden h-11 items-center gap-2 rounded-full bg-brand-red px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-red-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 xl:flex"
          >
            Create
            <Plus className="h-4 w-4" aria-hidden="true" />
          </Link>

          <div className="relative">
            <button
              ref={notificationButtonRef}
              type="button"
              onClick={handleNotificationToggle}
              aria-label="Notifications"
              aria-haspopup="dialog"
              aria-expanded={isNotificationOpen}
              aria-controls="user-notification-dropdown"
              className="relative flex h-11 w-11 items-center justify-center rounded-xl text-brand-text-secondary transition-colors hover:bg-brand-hover hover:text-brand-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red"
            >
              <BellIcon className="h-5 w-5" aria-hidden="true" />
              {unreadCount > 0 && (
                <>
                  <span
                    className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-red px-1 text-[10px] font-bold leading-none text-white"
                    aria-hidden="true"
                  >
                    {unreadCount}
                  </span>
                  <span className="sr-only">
                    {unreadCount} unread{' '}
                    {unreadCount === 1 ? 'notification' : 'notifications'}
                  </span>
                </>
              )}
            </button>

            {isNotificationOpen && (
              <div
                ref={notificationDropdownRef}
                className="absolute right-0 top-full z-50 mt-2 [&>*]:max-w-[calc(100vw-2rem)]"
              >
                <NotificationDropdown
                  id="user-notification-dropdown"
                  onClose={() => setOpenDropdown(null)}
                />
              </div>
            )}
          </div>

          <UserAccountMenu
            isOpen={isAccountOpen}
            onToggle={handleAccountToggle}
            onClose={() => setOpenDropdown(null)}
          />

          <button
            ref={mobileMenuButtonRef}
            type="button"
            onClick={handleMobileMenuToggle}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-brand-border text-brand-dark transition-colors hover:bg-brand-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red xl:hidden"
            aria-expanded={isMobileMenuOpen}
            aria-controls="user-mobile-navigation"
            aria-label={
              isMobileMenuOpen
                ? 'Close navigation menu'
                : 'Open navigation menu'
            }
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div
          id="user-mobile-navigation"
          className="absolute inset-x-0 top-full border-b border-brand-border bg-white px-4 py-5 shadow-xl shadow-black/5 sm:px-6 xl:hidden"
        >
          <div className="mx-auto flex max-w-2xl flex-col gap-4">
            <label
              className="relative block"
              htmlFor="user-mobile-navbar-search"
            >
              <span className="sr-only">Search articles and tech talks</span>
              <SearchIcon
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-text-secondary"
                aria-hidden="true"
              />
              <input
                id="user-mobile-navbar-search"
                type="search"
                placeholder="Search articles and tech talks"
                className="h-12 w-full rounded-xl border border-brand-border bg-brand-bg pl-11 pr-4 text-sm text-brand-text-primary placeholder:text-brand-text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red/30 focus-visible:border-brand-red"
              />
            </label>

            <nav
              className="flex flex-col gap-1 border-t border-brand-border pt-4"
              aria-label="Mobile navigation"
            >
              {USER_NAVIGATION_ITEMS.map((item) => {
                const isActive = isNavigationItemActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobileMenu}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'rounded-xl px-4 py-3 text-sm font-semibold transition-colors',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red',
                      isActive
                        ? 'bg-brand-red/10 text-brand-red'
                        : 'text-brand-dark hover:bg-brand-hover'
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}

              <Link
                href="/editor"
                onClick={closeMobileMenu}
                className="mt-3 flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-red px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-red-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2"
                aria-label="Create an Article"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Create Article
              </Link>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
