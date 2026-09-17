'use client';
import React, { useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { UserAvatar } from '@/components/UserAvatar';
import { useUser } from '@/lib/hooks/useUser';
import { UserRoleValue } from '@repo/shared';
import { cn } from '@/lib/utils';
import { BRAND_NAME, BRAND_SUB_NAME } from '@/lib/constants/brand';

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
import { BookOpenIcon } from '@/components/shared/icons/BookOpenIcon';
import { ProfileIcon } from '@/components/shared/icons/ProfileIcon';
import { UsersIcon } from '@/components/shared/icons/UsersIcon';
import { CommentIcon } from '@/components/shared/icons/CommentIcon';

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
];
const secondaryNavItems: NavItem[] = [
  {
    label: 'My Articles',
    href: '/my-articles',
    icon: <BookOpenIcon className="w-4 h-4 relative z-10" />,
    testId: 'nav-my-articles',
  },
  {
    label: 'My Profile',
    href: '/settings',
    icon: <ProfileIcon className="w-4 h-4 relative z-10" />,
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
  const isAdmin = user?.role === UserRoleValue.Admin;
  const isReviewerOrAdmin = user?.role === UserRoleValue.Reviewer || user?.role === UserRoleValue.Admin;

  // Both roles get an "Approvals" tab, but they own different halves of the
  // workflow: Reviewers decide on pending submissions, Admins publish what
  // Reviewers approved.
  const approvalsHref = isAdmin ? '/admin/approvals' : '/reviewer/approvals';
  const approvalsTestId = isAdmin
    ? 'nav-admin-approvals'
    : 'nav-reviewer-approvals';

  const isCollapsed = !isOpen;

  const isActive = (href: string): boolean =>
    href === '/' ? (pathname === '/' || pathname === '/admin') : pathname.startsWith(href);

  const itemClasses = (href: string): string =>
    cn(
      'sidebar-item relative flex items-center pr-4 h-11 rounded cursor-pointer transition-colors text-sm font-medium group',
      isActive(href)
        ? 'sidebar-active text-brand-red bg-white/10'
        : 'text-gray-400 hover:bg-white/5 hover:text-white'
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
    { scope: sidebarRef, dependencies: [pathname, isCollapsed] }
  );

  const Tooltip = ({ text }: { text: string }) => {
    if (!isCollapsed) return null;
    return (
      <span
        className={cn(
          'absolute left-full ml-2 z-50',
          'px-2 py-1',
          'bg-gray-800 text-white text-xs rounded',
          'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
          'pointer-events-none whitespace-nowrap'
        )}
      >
        {text}
      </span>
    );
  };

  return (
    <aside
      ref={sidebarRef}
      className={cn(
        'fixed left-0 top-0 h-screen min-h-screen bg-brand-dark flex flex-col z-20 shrink-0',
        isCollapsed ? 'w-[78px]' : 'w-60'
      )}
      data-testid="sidebar"
    >
      <div
        className={cn(
          'sticky top-0 z-10 flex h-16 w-full shrink-0 items-center bg-brand-dark',
          isCollapsed ? 'justify-center' : 'gap-1.5 px-4'
        )}
      >
        <Link
          href="/"
          className={cn(
            'flex items-center hover:opacity-80 transition-opacity',
            isCollapsed ? 'justify-center' : 'gap-1.5'
          )}
          data-testid={isCollapsed ? 'compact-logo' : 'sidebar-logo'}
          aria-label="1BT Wiki home"
        >
          <div className="h-10 w-10 bg-brand-red rounded flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-black leading-none">
              {BRAND_NAME}
            </span>
          </div>
          {!isCollapsed && (
            <span className="text-white font-semibold text-base leading-none tracking-tight">
              {BRAND_SUB_NAME}
            </span>
          )}
        </Link>
      </div>

      <nav className={`flex flex-col gap-1 ${isCollapsed ? 'px-2 pt-4' : 'px-4 pt-2'}`}>
        {mainNavItems.map((item) => {
          const showCompactLiveBadge = isCollapsed && item.showLiveBadge;
          
          return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              itemClasses(item.href),
              isCollapsed ? 'pl-[31px] gap-0' : 'pl-[20px] gap-[16px]'
            )}
            data-testid={item.testId}
            aria-label={isCollapsed ? item.label : undefined}
          >
            {isActive(item.href) && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-3/4 bg-brand-red active-indicator rounded-r-full" />
            )}
            <div className="relative">
              {item.icon}
              {showCompactLiveBadge && (
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
          );
        })}
      </nav>
      
      <div className={`border-t border-white/10 my-2 ${isCollapsed ? 'mx-2' : 'mx-4'} sidebar-item`} />
      
      <nav className={`flex flex-col gap-1 ${isCollapsed ? 'px-2' : 'px-4'}`}>
        {secondaryNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              itemClasses(item.href),
              isCollapsed ? 'pl-[31px] gap-0' : 'pl-[20px] gap-[16px]'
            )}
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
            href={approvalsHref}
            className={cn(
              itemClasses(approvalsHref),
              isCollapsed ? 'pl-[31px] gap-0' : 'pl-[20px] gap-[16px]'
            )}
            data-testid={approvalsTestId}
            aria-label={isCollapsed ? "Approvals" : undefined}
          >
            {isActive(approvalsHref) && (
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
            <div className="pr-4 pb-1 pl-[36px] sidebar-item">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-brand-red/60">
                Admin
              </span>
            </div>
          )}
          <nav className={`flex flex-col gap-1 ${isCollapsed ? 'px-2' : 'px-4'}`}>
            <Link
              href="/admin/users"
              className={cn(
                itemClasses('/admin/users'),
                isCollapsed ? 'pl-[31px] gap-0' : 'pl-[20px] gap-[16px]'
              )}
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
            <Link
              href="/admin/articles"
              className={cn(
                itemClasses('/admin/articles'),
                isCollapsed ? 'pl-[31px] gap-0' : 'pl-[20px] gap-[16px]'
              )}
              data-testid="nav-admin-articles"
              aria-label={isCollapsed ? "Article Management" : undefined}
            >
              {isActive('/admin/articles') && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-3/4 bg-brand-red active-indicator rounded-r-full" />
              )}
              <ArticleIcon className="w-4 h-4 relative z-10" />
              {!isCollapsed && <span className="relative z-10">Article Management</span>}
              <Tooltip text="Article Management" />
            </Link>
            <Link
              href="/admin/tech-talks"
              className={cn(
                itemClasses('/admin/tech-talks'),
                isCollapsed ? 'pl-[31px] gap-0' : 'pl-[20px] gap-[16px]'
              )}
              data-testid="nav-admin-tech-talks"
              aria-label={isCollapsed ? "Tech Talk Management" : undefined}
            >
              {isActive('/admin/tech-talks') && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-3/4 bg-brand-red active-indicator rounded-r-full" />
              )}
              <TechTalkIcon className="w-4 h-4 relative z-10" />
              {!isCollapsed && <span className="relative z-10">Tech Talk Management</span>}
              <Tooltip text="Tech Talk Management" />
            </Link>
            <Link
              href="/admin/comments"
              className={cn(
                itemClasses('/admin/comments'),
                isCollapsed ? 'pl-[31px] gap-0' : 'pl-[20px] gap-[16px]'
              )}
              data-testid="nav-admin-comments"
              aria-label={isCollapsed ? "Comment Moderation" : undefined}
            >
              {isActive('/admin/comments') && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-3/4 bg-brand-red active-indicator rounded-r-full" />
              )}
              <CommentIcon className="w-4 h-4 relative z-10" />
              {!isCollapsed && <span className="relative z-10">Comment Moderation</span>}
              <Tooltip text="Comment Moderation" />
            </Link>
          </nav>
        </>
      )}
      
      <div className="flex-1" />
      
      <div
        className={cn(
          'sidebar-item border-t border-white/10 py-4 flex items-center',
          isCollapsed ? 'justify-center' : 'pr-4 pl-[36px]'
        )}
      >
        <div className="relative group flex items-center justify-center">
          <UserAvatar format={isCollapsed ? 'collapsed' : 'expanded'} />
          <Tooltip text="Profile" />
        </div>
      </div>
    </aside>
  );
}
