'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowUp } from 'lucide-react';

const SHOW_AFTER_PX = 300;

export function ScrollToTopButton(): React.JSX.Element | null {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  const scrollTargetRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const handleScroll = (event: Event): void => {
      const target = event.target;
      let element: HTMLElement | null = null;
      let scrollTop = 0;

      if (
        target === document ||
        target === document.documentElement ||
        target === document.body
      ) {
        element = document.scrollingElement as HTMLElement | null;
        scrollTop = window.scrollY;
      } else if (
        target instanceof HTMLElement &&
        target.clientHeight >= window.innerHeight * 0.5
      ) {
        element = target;
        scrollTop = target.scrollTop;
      }

      if (!element) return;

      if (scrollTop > SHOW_AFTER_PX) {
        scrollTargetRef.current = element;
        setIsVisible(true);
      } else if (scrollTargetRef.current === element) {
        setIsVisible(false);
      }
    };

    document.addEventListener('scroll', handleScroll, {
      capture: true,
      passive: true,
    });
    return () => document.removeEventListener('scroll', handleScroll, true);
  }, []);

  // A new page has its own scroll position, so start hidden.
  useEffect(() => {
    scrollTargetRef.current = null;
    setIsVisible(false);
  }, [pathname]);

  if (!isVisible) return null;

  return (
    <button
      type="button"
      onClick={() =>
        scrollTargetRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
      }
      aria-label="Scroll to top"
      data-testid="scroll-to-top"
      className="fixed bottom-20 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-brand-red text-white shadow-lg transition hover:bg-brand-red-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}
