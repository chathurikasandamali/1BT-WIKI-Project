'use client';

import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { BRAND_NAME, BRAND_SUB_NAME } from '@/lib/constants/brand';
import type { PreviewKind } from '@/components/landing/previewContent';

interface LandingNavbarProps {
  isAuthenticating: boolean;
  onAuthenticate: () => void;
  onReset: () => void;
  onSelectKind: (kind: PreviewKind) => void;
}

export function LandingNavbar({
  isAuthenticating,
  onAuthenticate,
  onReset,
  onSelectKind,
}: LandingNavbarProps): React.JSX.Element {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (!isMenuOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMenuOpen]);

  const handleReset = () => {
    onReset();
    setIsMenuOpen(false);
  };

  const handleKindSelection = (kind: PreviewKind) => {
    onSelectKind(kind);
    setIsMenuOpen(false);
  };

  return (
    <header className="relative z-50 border-b border-brand-border/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-[1440px] items-center gap-6 px-5 sm:px-8 lg:px-10">
        <button
          type="button"
          onClick={handleReset}
          className="flex shrink-0 items-center gap-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2"
          aria-label="1BT Wiki home"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-red text-xs font-black tracking-tight text-white shadow-[0_10px_28px_rgba(204,0,0,0.18)]">
            {BRAND_NAME}
          </span>
          <span className="font-display text-lg font-bold tracking-[-0.03em] text-brand-dark">
            {BRAND_SUB_NAME}
          </span>
        </button>

        <nav
          className="hidden items-center gap-1 xl:flex"
          aria-label="Primary navigation"
        >
          <button
            type="button"
            onClick={handleReset}
            className="rounded-full px-4 py-2 text-sm font-semibold text-brand-dark transition hover:bg-brand-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red"
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => handleKindSelection('article')}
            className="rounded-full px-4 py-2 text-sm font-semibold text-brand-text-secondary transition hover:bg-brand-hover hover:text-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red"
          >
            Articles
          </button>
          <button
            type="button"
            onClick={() => handleKindSelection('tech-talk')}
            className="rounded-full px-4 py-2 text-sm font-semibold text-brand-text-secondary transition hover:bg-brand-hover hover:text-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red"
          >
            Tech Talks
          </button>
        </nav>

        <div className="ml-auto hidden items-center gap-3 xl:flex">
          <button
            type="button"
            onClick={onAuthenticate}
            disabled={isAuthenticating}
            aria-label={isAuthenticating ? 'Signing in' : 'Log in with Google'}
            className="h-11 rounded-full border border-brand-border bg-white px-5 text-sm font-semibold text-brand-dark transition hover:border-brand-dark hover:bg-brand-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
          >
            {isAuthenticating ? 'Signing in...' : 'Log in'}
          </button>
          <button
            type="button"
            onClick={onAuthenticate}
            disabled={isAuthenticating}
            aria-label={
              isAuthenticating ? 'Signing in' : 'Get started with Google'
            }
            className="h-11 rounded-full bg-brand-red px-5 text-sm font-semibold text-white shadow-[0_10px_26px_rgba(204,0,0,0.2)] transition hover:bg-brand-red-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 disabled:cursor-wait disabled:bg-brand-red-disabled"
          >
            {isAuthenticating ? 'Signing in...' : 'Get started'}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsMenuOpen((current) => !current)}
          className="ml-auto flex h-11 w-11 items-center justify-center rounded-xl border border-brand-border text-brand-dark transition hover:bg-brand-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red xl:hidden"
          aria-expanded={isMenuOpen}
          aria-controls="mobile-landing-navigation"
          aria-label={
            isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'
          }
        >
          {isMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {isMenuOpen && (
        <div
          id="mobile-landing-navigation"
          className="absolute left-0 right-0 top-full border-b border-brand-border bg-white px-5 py-5 shadow-xl shadow-black/5 xl:hidden"
        >
          <nav
            className="mx-auto flex max-w-2xl flex-col gap-2"
            aria-label="Mobile navigation"
          >
            <button
              type="button"
              onClick={handleReset}
              className="rounded-xl px-4 py-3 text-left text-sm font-semibold text-brand-dark hover:bg-brand-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => handleKindSelection('article')}
              className="rounded-xl px-4 py-3 text-left text-sm font-semibold text-brand-dark hover:bg-brand-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red"
            >
              Articles
            </button>
            <button
              type="button"
              onClick={() => handleKindSelection('tech-talk')}
              className="rounded-xl px-4 py-3 text-left text-sm font-semibold text-brand-dark hover:bg-brand-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red"
            >
              Tech Talks
            </button>
            <div className="mt-2 grid grid-cols-2 gap-3 border-t border-brand-border pt-4">
              <button
                type="button"
                onClick={onAuthenticate}
                disabled={isAuthenticating}
                aria-label={
                  isAuthenticating ? 'Signing in' : 'Log in with Google'
                }
                className="h-12 rounded-xl border border-brand-border text-sm font-semibold text-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red disabled:cursor-wait disabled:opacity-60"
              >
                {isAuthenticating ? 'Signing in...' : 'Log in'}
              </button>
              <button
                type="button"
                onClick={onAuthenticate}
                disabled={isAuthenticating}
                aria-label={
                  isAuthenticating ? 'Signing in' : 'Get started with Google'
                }
                className="h-12 rounded-xl bg-brand-red text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red disabled:cursor-wait disabled:bg-brand-red-disabled"
              >
                {isAuthenticating ? 'Signing in...' : 'Get started'}
              </button>
            </div>
          </nav>
        </div>
      )}

    </header>
  );
}
