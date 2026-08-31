'use client';

import React, { useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { UserNavbar } from '@/components/layout/UserNavbar';
import { UserProvider, useUser } from '@/lib/hooks/useUser';
import {
  NotificationProvider,
  useNotificationContext,
} from '@/components/providers/NotificationProvider';
import { isE2E } from '@/lib/e2e';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { BRAND_NAME, BRAND_SUB_NAME } from '@/lib/constants/brand';
import { cn } from '@/lib/utils';
import { useLenisScroll } from '@/lib/hooks/useLenisScroll';

gsap.registerPlugin(useGSAP);

interface DashboardLayoutProps {
  children: React.ReactNode;
}

// Inner layout component — must live inside NotificationProvider to consume context.
function DashboardLayoutInner({
  children,
}: DashboardLayoutProps): React.JSX.Element {
  const pathname = usePathname();
  const isEditorRoute = pathname?.startsWith('/editor');
  const { user, loading: isUserLoading } = useUser();
  const isNormalUser = user?.role === 'User';
  const usesUserDashboardShell =
    !isEditorRoute && !isUserLoading && isNormalUser;
  const usesLegacyDashboardShell =
    !isEditorRoute &&
    !isUserLoading &&
    (user?.role === 'Reviewer' || user?.role === 'Admin');

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAppLoading, setIsAppLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const mainWrapperRef = useRef<HTMLDivElement>(null);

  useLenisScroll(isEditorRoute ? null : 'main-scroll-container');

  // Initial App Preloader Animation
  useGSAP(
    () => {
      if ((!isEditorRoute && isUserLoading) || !isAppLoading) return;

      if (isE2E()) {
        setIsAppLoading(false);
        return;
      }

      const tl = gsap.timeline({
        onComplete: () => {
          setIsAppLoading(false);
        },
      });

      // 1. Logo scale & rotation entry
      tl.fromTo(
        '.preloader-logo',
        { scale: 0, rotation: -30, opacity: 0 },
        {
          scale: 1,
          rotation: 0,
          opacity: 1,
          duration: 0.8,
          ease: 'back.out(1.5)',
        }
      );

      // 2. WIKI text slide up and fade
      tl.fromTo(
        '.preloader-text',
        { y: 10, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, ease: 'power2.out' },
        '-=0.3'
      );

      // 3. Keep loading visible, then fade-out the preloader overlay
      tl.to('.preloader', {
        opacity: 0,
        pointerEvents: 'none',
        duration: 0.5,
        ease: 'power3.inOut',
        delay: 0.7,
      });

      // 4. Coordinated reveal of Sidebar, Navbar, and main page content
      const sidebar = document.querySelector('[data-testid="sidebar"]');
      const navbar = document.querySelector('[data-testid="navbar"]');
      const mainContent = document.querySelector(
        '[data-testid="main-content"]'
      );

      if (sidebar) {
        tl.fromTo(
          sidebar,
          { x: -240 },
          { x: 0, duration: 0.5, ease: 'power3.out' },
          '-=0.3'
        );
      }
      if (navbar) {
        tl.fromTo(
          navbar,
          { y: -20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out' },
          '-=0.3'
        );
      }
      if (mainContent) {
        tl.fromTo(
          mainContent,
          { y: 15, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' },
          '-=0.4'
        );
      }
    },
    { scope: containerRef, dependencies: [isEditorRoute, isUserLoading] }
  );

  // Sidebar Open/Close Toggle Animation
  useGSAP(
    () => {
      if (isAppLoading || isE2E()) return; // Prevent initial layout conflicts

      const mainWrapper = mainWrapperRef.current;
      if (!mainWrapper) return;

      if (isEditorRoute) {
        gsap.set(mainWrapper, { clearProps: 'marginLeft' });
        return;
      }

      if (!usesLegacyDashboardShell) return;

      const sidebar = document.querySelector('[data-testid="sidebar"]');
      const navbar = document.querySelector('[data-testid="navbar"]');

      if (!sidebar || !navbar) return;

      if (isSidebarOpen) {
        // Expand sidebar to 240px
        gsap.to(sidebar, {
          width: 240,
          opacity: 1,
          duration: 0.4,
          ease: 'power2.out',
        });
        // Slide navbar and main content area to make space
        gsap.to(navbar, {
          left: 240,
          duration: 0.4,
          ease: 'power2.out',
        });
        gsap.to(mainWrapper, {
          marginLeft: 240,
          duration: 0.4,
          ease: 'power2.out',
        });

        // Stagger-in the sidebar navigation links
        gsap.fromTo(
          '.sidebar-item',
          { x: -15, opacity: 0 },
          {
            x: 0,
            opacity: 1,
            duration: 0.3,
            stagger: 0.04,
            ease: 'power2.out',
            delay: 0.05,
          }
        );
      } else {
        // Collapse sidebar to 78px
        gsap.to(sidebar, {
          width: 78,
          opacity: 1,
          duration: 0.4,
          ease: 'power2.inOut',
        });
        // Slide navbar and main content area to compact width
        gsap.to(navbar, {
          left: 78,
          duration: 0.4,
          ease: 'power2.inOut',
        });
        gsap.to(mainWrapper, {
          marginLeft: 78,
          duration: 0.4,
          ease: 'power2.inOut',
        });
      }
    },
    {
      dependencies: [
        isSidebarOpen,
        isAppLoading,
        isEditorRoute,
        usesLegacyDashboardShell,
      ],
    }
  );

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

  const { unreadCount } = useNotificationContext();

  return (
    <div
      ref={containerRef}
      className="flex h-screen overflow-hidden bg-brand-bg"
    >
      {/* Initial App Load Splash Screen */}
      {isAppLoading && (
        <div className="preloader fixed inset-0 bg-brand-dark z-[9999] flex flex-col items-center justify-center">
          <div className="preloader-logo h-16 w-16 bg-brand-red rounded-xl flex items-center justify-center shadow-2xl shadow-brand-red/15 border border-white/5">
            <span className="text-white text-lg font-black leading-none tracking-tight">
              {BRAND_NAME}
            </span>
          </div>
          <div className="preloader-text mt-4 text-white/90 font-bold tracking-[0.25em] text-xs uppercase opacity-0">
            {BRAND_SUB_NAME}
          </div>
          <div className="preloader-spinner mt-8 w-5 h-5 border-2 border-white/10 border-t-brand-red rounded-full animate-spin"></div>
        </div>
      )}

      {usesLegacyDashboardShell && <Sidebar isOpen={isSidebarOpen} />}
      <div
        ref={mainWrapperRef}
        className={cn(
          'flex flex-col flex-1',
          usesLegacyDashboardShell && 'ml-60'
        )}
      >
        {usesUserDashboardShell && <UserNavbar />}
        {usesLegacyDashboardShell && (
          <Navbar
            notificationCount={unreadCount}
            isSidebarOpen={isSidebarOpen}
            onToggleSidebar={toggleSidebar}
          />
        )}
        <main
          id="main-scroll-container"
          className={cn(
            'flex-1 overflow-y-auto bg-brand-bg',
            usesUserDashboardShell && 'pt-20',
            usesLegacyDashboardShell && 'pt-16'
          )}
          data-testid="main-content"
        >
          <div className="min-h-full">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps): React.JSX.Element {
  return (
    <UserProvider>
      <NotificationProvider>
        <DashboardLayoutInner>{children}</DashboardLayoutInner>
      </NotificationProvider>
    </UserProvider>
  );
}
