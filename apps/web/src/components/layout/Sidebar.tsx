'use client';
import React, { useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { authClient } from '@/lib/auth/client';
import { UserAvatar } from '@/components/UserAvatar';
import { useUser } from '@/lib/hooks/useUser';
import { isE2E } from '@/lib/e2e';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  testId: string;
  showLiveBadge?: boolean;
}

gsap.registerPlugin(useGSAP);

import { CheckCircleIcon } from '@/components/shared/icons/CheckCircleIcon';
import { HomeIcon } from '@/components/shared/icons/HomeIcon';
import { ArticleIcon } from '@/components/shared/icons/ArticleIcon';
import { TechTalkIcon } from '@/components/shared/icons/TechTalkIcon';
import { ForumIcon } from '@/components/shared/icons/ForumIcon';
import { BookOpenIcon } from '@/components/shared/icons/BookOpenIcon';
import { SettingsIcon } from '@/components/shared/icons/SettingsIcon';
import { LogoutIcon } from '@/components/shared/icons/LogoutIcon';
import { UsersIcon } from '@/components/shared/icons/UsersIcon';

const mainNavItems: NavItem[] = [
  {
    label: 'Home',
    href: '/',
    icon: <HomeIcon className="w-4 h-4 relative z-10" />,
    testId: 'nav-home',
  },
  {
    label: 'Articles',
    href: '/articles',
    icon: <ArticleIcon className="w-4 h-4 relative z-10" />,
    testId: 'nav-articles',
  },
  {
    label: 'Tech Talks',
    href: '/tech-talks',
    icon: <TechTalkIcon className="w-4 h-4 relative z-10" />,
    testId: 'nav-tech-talks',
    showLiveBadge: true,
  },
  {
    label: 'Forum',
    href: '/forum',
    icon: <ForumIcon className="w-4 h-4 relative z-10" />,
    testId: 'nav-forum',
  },
];
const secondaryNavItems: NavItem[] = [
  {
    label: 'My Articles',
    href: '/my-articles',
    icon: <BookOpenIcon className="w-4 h-4 relative z-10" />,
    testId: 'nav-my-articles',
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: <SettingsIcon className="w-4 h-4 relative z-10" />,
    testId: 'nav-settings',
  },
];

export function Sidebar(): React.JSX.Element {
  const pathname = usePathname();
  const sidebarRef = useRef<HTMLElement>(null);
  const { user } = useUser();
  const isAdmin = user?.role === 'Admin';
  const isReviewerOrAdmin = user?.role === 'Reviewer' || user?.role === 'Admin';

  const isActive = (href: string): boolean =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const itemClasses = (href: string): string =>
    isActive(href)
      ? 'sidebar-item sidebar-active relative flex items-center gap-4 pr-4 h-11 rounded cursor-pointer transition-colors text-sm font-medium text-brand-red bg-white/10'
      : 'sidebar-item relative flex items-center gap-4 pr-4 h-11 rounded cursor-pointer transition-colors text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white';

  useGSAP(
    () => {
      if (isE2E()) return;
      // [GSAP] Sidebar Menu load Staggered fade-in + slide-right on initial load (stagger: 0.08s)
      gsap.from('.sidebar-item', {
        x: -20,
        opacity: 0,
        duration: 0.4,
        stagger: 0.08,
        ease: 'power2.out',
      });
    },
    { scope: sidebarRef }
  );

  useGSAP(
    () => {
      // [GSAP] Active sidebar item Transition background & slide-in red indicator (0.2s)
      gsap.from('.active-indicator', {
        x: -5,
        opacity: 0,
        duration: 0.2,
        ease: 'power2.out',
      });
    },
    { scope: sidebarRef, dependencies: [pathname] }
  );

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
      window.location.assign('/signin'); // Redirect to the sign-in page after sign-out
    } catch (error) {
      console.error('Error during sign-out:', error);
    }
  };

  return (
    <aside
      ref={sidebarRef}
      className="fixed left-0 top-0 h-screen min-h-screen w-60 bg-brand-dark flex flex-col z-20"
      data-testid="sidebar"
    >
      <div
        className="pr-4 pt-6 pb-2 sidebar-item"
        style={{ paddingLeft: '36px' }}
      >
        <span className="text-xs font-semibold uppercase tracking-widest text-brand-text-secondary">
          Menu
        </span>
      </div>
      <nav className="flex flex-col px-4 gap-1">
        {mainNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={itemClasses(item.href)}
            style={{ paddingLeft: '20px' }}
            data-testid={item.testId}
          >
            {isActive(item.href) && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-3/4 bg-brand-red active-indicator rounded-r-full" />
            )}
            {item.icon}
            <span className="relative z-10">{item.label}</span>
            {item.showLiveBadge && (
              <span className="relative z-10 ml-auto text-[10px] font-bold bg-green-500 text-white px-1.5 py-0.5 rounded-full">
                LIVE
              </span>
            )}
          </Link>
        ))}
      </nav>
      <div className="border-t border-white/10 my-2 mx-4 sidebar-item" />
      <nav className="flex flex-col px-4 gap-1">
        {secondaryNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={itemClasses(item.href)}
            style={{ paddingLeft: '20px' }}
            data-testid={item.testId}
          >
            {isActive(item.href) && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-3/4 bg-brand-red active-indicator rounded-r-full" />
            )}
            {item.icon}
            <span className="relative z-10">{item.label}</span>
          </Link>
        ))}
        {isReviewerOrAdmin && (
          <Link
            href="/reviewer/approvals"
            className={itemClasses('/reviewer/approvals')}
            style={{ paddingLeft: '20px' }}
            data-testid="nav-reviewer-approvals"
          >
            {isActive('/reviewer/approvals') && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-3/4 bg-brand-red active-indicator rounded-r-full" />
            )}
            <CheckCircleIcon className="w-4 h-4 relative z-10" />
            <span className="relative z-10">Approvals</span>
          </Link>
        )}
      </nav>
      {isAdmin && (
        <>
          <div className="border-t border-white/10 my-2 mx-4 sidebar-item" />
          <div
            className="pr-4 pb-1 sidebar-item"
            style={{ paddingLeft: '36px' }}
          >
            <span className="text-[10px] font-semibold uppercase tracking-widest text-brand-red/60">
              Admin
            </span>
          </div>
          <nav className="flex flex-col px-4 gap-1">
            <Link
              href="/admin/users"
              className={itemClasses('/admin/users')}
              style={{ paddingLeft: '20px' }}
              data-testid="nav-admin-users"
            >
              {isActive('/admin/users') && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-3/4 bg-brand-red active-indicator rounded-r-full" />
              )}
              <UsersIcon className="w-4 h-4 relative z-10" />
              <span className="relative z-10">User Management</span>
            </Link>
          </nav>
        </>
      )}
      <div className="flex-1" />
      <div
        className="sidebar-item border-t border-white/10 pr-4 py-4 flex items-center gap-3"
        style={{ paddingLeft: '36px' }}
      >
        <UserAvatar format="expanded" />
        <button
          type="submit"
          onClick={handleSignOut}
          className="text-brand-text-secondary hover:text-white transition-colors flex-shrink-0"
          data-testid="logout-btn"
          aria-label="Logout"
        >
          <LogoutIcon className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
