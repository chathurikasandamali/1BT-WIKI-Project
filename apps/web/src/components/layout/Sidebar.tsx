'use client';
import React, { useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { authClient } from '@/lib/auth/client';
import { UserAvatar } from '@/components/UserAvatar';
import { useUser } from '@/lib/hooks/useUser';

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

interface SidebarProps {
  isOpen?: boolean;
}

export function Sidebar({ isOpen = true }: SidebarProps): React.JSX.Element {
  const pathname = usePathname();
  const sidebarRef = useRef<HTMLElement>(null);
  const { user } = useUser();
  const isAdmin = user?.role === 'Admin';
  const isReviewerOrAdmin = user?.role === 'Reviewer' || user?.role === 'Admin';

  const isCollapsed = !isOpen;

  const isActive = (href: string): boolean =>
    href === '/' ? (pathname === '/' || pathname === '/admin') : pathname.startsWith(href);

  const itemClasses = (href: string): string =>
    isActive(href)
      ? 'sidebar-item sidebar-active relative flex items-center pr-4 h-11 rounded cursor-pointer transition-colors text-sm font-medium text-brand-red bg-white/10 group'
      : 'sidebar-item relative flex items-center pr-4 h-11 rounded cursor-pointer transition-colors text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white group';

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
    { scope: sidebarRef, dependencies: [pathname, isCollapsed] }
  );

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
      window.location.assign('/signin'); // Redirect to the sign-in page after sign-out
    } catch (error) {
      console.error('Error during sign-out:', error);
    }
  };

  const Tooltip = ({ text }: { text: string }) => {
    if (!isCollapsed) return null;
    return (
      <span className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none whitespace-nowrap z-50">
        {text}
      </span>
    );
  };

  return (
    <aside
      ref={sidebarRef}
      className={`fixed left-0 top-0 h-screen min-h-screen bg-brand-dark flex flex-col z-20 shrink-0 ${isCollapsed ? 'w-[78px]' : 'w-60'}`}
      data-testid="sidebar"
    >
      {isCollapsed ? (
        <div className="flex h-16 w-full items-center justify-center pt-2">
          <Link
            href="/"
            className="flex items-center justify-center hover:opacity-80 transition-opacity"
            data-testid="compact-logo"
            aria-label="1BT Wiki home"
          >
            <div className="h-10 w-10 bg-brand-red rounded flex items-center justify-center">
              <span className="text-white text-xs font-black leading-none">
                1BT
              </span>
            </div>
          </Link>
        </div>
      ) : (
        <div
          className="pr-4 pt-6 pb-2 sidebar-item"
          style={{ paddingLeft: '36px' }}
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-brand-text-secondary">
            Menu
          </span>
        </div>
      )}
      
      <nav className={`flex flex-col gap-1 ${isCollapsed ? 'px-2 pt-4' : 'px-4'}`}>
        {mainNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={itemClasses(item.href)}
            style={{ paddingLeft: isCollapsed ? '31px' : '20px', gap: isCollapsed ? '0' : '16px' }}
            data-testid={item.testId}
            aria-label={isCollapsed ? item.label : undefined}
          >
            {isActive(item.href) && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-3/4 bg-brand-red active-indicator rounded-r-full" />
            )}
            <div className="relative">
              {item.icon}
              {isCollapsed && item.showLiveBadge && (
                <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-500" />
              )}
            </div>
            {!isCollapsed && (
              <>
                <span className="relative z-10">{item.label}</span>
                {item.showLiveBadge && (
                  <span className="relative z-10 ml-auto text-[10px] font-bold bg-green-500 text-white px-1.5 py-0.5 rounded-full">
                    LIVE
                  </span>
                )}
              </>
            )}
            <Tooltip text={item.label} />
          </Link>
        ))}
      </nav>
      
      <div className={`border-t border-white/10 my-2 ${isCollapsed ? 'mx-2' : 'mx-4'} sidebar-item`} />
      
      <nav className={`flex flex-col gap-1 ${isCollapsed ? 'px-2' : 'px-4'}`}>
        {secondaryNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={itemClasses(item.href)}
            style={{ paddingLeft: isCollapsed ? '31px' : '20px', gap: isCollapsed ? '0' : '16px' }}
            data-testid={item.testId}
            aria-label={isCollapsed ? item.label : undefined}
          >
            {isActive(item.href) && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-3/4 bg-brand-red active-indicator rounded-r-full" />
            )}
            {item.icon}
            {!isCollapsed && <span className="relative z-10">{item.label}</span>}
            <Tooltip text={item.label} />
          </Link>
        ))}
        {isReviewerOrAdmin && (
          <Link
            href="/reviewer/approvals"
            className={itemClasses('/reviewer/approvals')}
            style={{ paddingLeft: isCollapsed ? '31px' : '20px', gap: isCollapsed ? '0' : '16px' }}
            data-testid="nav-reviewer-approvals"
            aria-label={isCollapsed ? "Approvals" : undefined}
          >
            {isActive('/reviewer/approvals') && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-3/4 bg-brand-red active-indicator rounded-r-full" />
            )}
            <CheckCircleIcon className="w-4 h-4 relative z-10" />
            {!isCollapsed && <span className="relative z-10">Approvals</span>}
            <Tooltip text="Approvals" />
          </Link>
        )}
      </nav>
      
      {isAdmin && (
        <>
          <div className={`border-t border-white/10 my-2 ${isCollapsed ? 'mx-2' : 'mx-4'} sidebar-item`} />
          {!isCollapsed && (
            <div
              className="pr-4 pb-1 sidebar-item"
              style={{ paddingLeft: '36px' }}
            >
              <span className="text-[10px] font-semibold uppercase tracking-widest text-brand-red/60">
                Admin
              </span>
            </div>
          )}
          <nav className={`flex flex-col gap-1 ${isCollapsed ? 'px-2' : 'px-4'}`}>
            <Link
              href="/admin/users"
              className={itemClasses('/admin/users')}
              style={{ paddingLeft: isCollapsed ? '31px' : '20px', gap: isCollapsed ? '0' : '16px' }}
              data-testid="nav-admin-users"
              aria-label={isCollapsed ? "User Management" : undefined}
            >
              {isActive('/admin/users') && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-3/4 bg-brand-red active-indicator rounded-r-full" />
              )}
              <UsersIcon className="w-4 h-4 relative z-10" />
              {!isCollapsed && <span className="relative z-10">User Management</span>}
              <Tooltip text="User Management" />
            </Link>
          </nav>
        </>
      )}
      
      <div className="flex-1" />
      
      <div
        className={`sidebar-item border-t border-white/10 py-4 flex items-center ${isCollapsed ? 'justify-center flex-col gap-4' : 'pr-4 gap-3'}`}
        style={isCollapsed ? {} : { paddingLeft: '36px' }}
      >
        <div className="relative group flex items-center justify-center">
          <UserAvatar format={isCollapsed ? 'collapsed' : 'expanded'} />
          <Tooltip text="Profile" />
        </div>
        
        <button
          type="submit"
          onClick={handleSignOut}
          className="text-brand-text-secondary hover:text-white transition-colors flex-shrink-0 relative group"
          data-testid="logout-btn"
          aria-label="Logout"
        >
          <LogoutIcon className="h-4 w-4" />
          <Tooltip text="Logout" />
        </button>
      </div>
    </aside>
  );
}
