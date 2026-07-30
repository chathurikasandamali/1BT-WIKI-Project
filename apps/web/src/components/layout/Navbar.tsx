'use client';

import Link from 'next/link';

import React, { useRef, useState, useEffect } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { UserAvatar } from '@/components/UserAvatar';
import { isE2E } from '@/lib/e2e';
import { BRAND_NAME, BRAND_SUB_NAME } from '@/lib/constants/brand';
import { SearchIcon } from '@/components/shared/icons/SearchIcon';
import { BellIcon } from '@/components/shared/icons/BellIcon';
import { ChevronDownIcon } from '@/components/shared/icons/ChevronDownIcon';
import { NotificationDropdown } from './NotificationDropdown';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

interface NavbarProps {
  notificationCount?: number;
  userInitials?: string;
  userName?: string;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

gsap.registerPlugin(useGSAP);

export function Navbar({
  notificationCount = 3,
  isSidebarOpen = true,
  onToggleSidebar,
}: NavbarProps): React.JSX.Element {
  const containerRef = useRef<HTMLElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        bellRef.current &&
        !bellRef.current.contains(event.target as Node)
      ) {
        setIsNotificationOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsNotificationOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useGSAP(
    () => {
      if (isE2E()) return;
      // [GSAP] Nav bar: fade-down (y: -20 -> 0, 0.5s)
      gsap.from(containerRef.current, {
        y: -20,
        opacity: 0,
        duration: 0.5,
      });

      // [GSAP] Bell Notification Rubber-band shake on new notification (elastic ease)
      if (notificationCount > 0 && bellRef.current) {
        gsap.fromTo(
          bellRef.current,
          { scaleX: 1.25, scaleY: 0.75 },
          {
            scaleX: 1,
            scaleY: 1,
            duration: 1,
            ease: 'elastic.out(1, 0.3)',
            delay: 0.5,
          }
        );
      }
    },
    { scope: containerRef, dependencies: [notificationCount] }
  );

  // [GSAP] Burger menu icon lines morphing animation
  useGSAP(
    () => {
      const lines = gsap.utils.toArray('.burger-line') as HTMLElement[];
      const [line1, line2, line3] = lines;
      if (line1 && line2 && line3) {
        if (isSidebarOpen) {
          gsap.to(line1, {
            y: 5,
            rotation: 45,
            duration: 0.3,
            ease: 'power2.out',
          });
          gsap.to(line2, { opacity: 0, scaleX: 0, duration: 0.2 });
          gsap.to(line3, {
            y: -5,
            rotation: -45,
            duration: 0.3,
            ease: 'power2.out',
          });
        } else {
          gsap.to(line1, {
            y: 0,
            rotation: 0,
            duration: 0.3,
            ease: 'power2.out',
          });
          gsap.to(line2, { opacity: 1, scaleX: 1, duration: 0.3 });
          gsap.to(line3, {
            y: 0,
            rotation: 0,
            duration: 0.3,
            ease: 'power2.out',
          });
        }
      }
    },
    { scope: containerRef, dependencies: [isSidebarOpen] }
  );

  return (
    <header
      ref={containerRef}
      className="fixed top-0 right-0 h-16 bg-white border-b border-brand-border z-10
                 flex items-center gap-4 px-6"
      style={{ left: isSidebarOpen ? '240px' : '78px' }}
      data-testid="navbar"
    >
      {onToggleSidebar && (
        <button
          type="button"
          onClick={onToggleSidebar}
          className="flex flex-col justify-center items-center w-9 h-9 rounded-lg hover:bg-brand-hover cursor-pointer transition-colors text-brand-dark"
          data-testid="sidebar-toggle"
          aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
        </button>
      )}

      {isSidebarOpen && (
        <Link
          href="/"
          className="flex items-center gap-1.5 flex-shrink-0 hover:opacity-80 transition-opacity ml-2"
          data-testid="logo"
          aria-label="1BT Wiki home"
        >
          <div className="h-10 w-10 bg-brand-red rounded flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-black leading-none">
              {BRAND_NAME}
            </span>
          </div>
          <span className="text-brand-text-secondary font-semibold text-base leading-none tracking-tight">
            {BRAND_SUB_NAME}
          </span>
        </Link>
      )}

      <div className="flex-1 px-4">
        <div className="relative max-w-xl mx-auto">
          <SearchIcon
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-secondary"
            aria-hidden="true"
          />
          <input
            type="text"
            placeholder="Search articles, tech talks..."
            className="w-full !pl-10 pr-4 py-2 bg-brand-bg border border-brand-border rounded-full
                       text-sm text-brand-text-primary placeholder:text-brand-text-secondary
                       focus:outline-none focus:ring-2 focus:ring-brand-red/20
                       focus:border-brand-red transition-colors"
            data-testid="search-input"
          />
        </div>
      </div>

      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="relative">
          <button
            ref={bellRef}
            type="button"
            onClick={() => setIsNotificationOpen((current) => !current)}
            aria-label="Notifications"
            aria-haspopup="dialog"
            aria-expanded={isNotificationOpen}
            aria-controls="notification-dropdown"
            className="relative text-brand-text-secondary hover:text-brand-text-primary transition-colors block"
            data-testid="notification-bell"
          >
            <BellIcon className="h-5 w-5" />
            {notificationCount > 0 && (
              <span
                className="absolute -top-1.5 -right-1.5 bg-brand-red text-white text-[10px] font-bold
                               rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5"
              >
                {notificationCount}
              </span>
            )}
          </button>
          
          {isNotificationOpen && (
            <div ref={dropdownRef} className="absolute right-0 top-full mt-2 z-50">
              <NotificationDropdown
                id="notification-dropdown"
                onClose={() => setIsNotificationOpen(false)}
              />
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-brand-border" />

        <button
          type="button"
          className="flex items-center gap-2 hover:bg-brand-hover rounded-lg px-2 py-1 transition-colors"
          data-testid="user-avatar"
        >
          <UserAvatar format="collapsed" />
          <ChevronDownIcon className="h-3 w-3 text-brand-text-secondary ml-1" />
        </button>
      </div>
    </header>
  );
}
