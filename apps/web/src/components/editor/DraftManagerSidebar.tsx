'use client';

import React, { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ChevronLeft, ChevronRight, Search, PenSquare, FileText } from 'lucide-react';
import Link from 'next/link';
import { fetchMyArticles, type ArticleListItem } from '@/lib/api/articles';
import { formatDate } from '@/lib/utils/date';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useLenisScroll } from '@/lib/hooks/useLenisScroll';
interface DraftManagerSidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  currentArticleId?: string;
}

export function DraftManagerSidebar({
  isOpen,
  toggleSidebar,
  currentArticleId,
}: DraftManagerSidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useLenisScroll('drafts-sidebar-scroll-container');

  const [drafts, setDrafts] = useState<ArticleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Fetch drafts safely
  useEffect(() => {
    let active = true;

    const loadDrafts = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await fetchMyArticles(1, 50);

        if (!active) return;

        const editable = result.articles.filter(
          (article) =>
            article.status === 'Draft' || article.status === 'Unpublished'
        );

        setDrafts(editable);
      } catch {
        if (active) {
          setError('Could not load your drafts.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadDrafts();

    return () => {
      active = false;
    };
  }, []);

  const visibleDrafts = drafts.filter((article) =>
    article.title.toLowerCase().includes(search.trim().toLowerCase())
  );

  useGSAP(() => {
    if (!sidebarRef.current) return;

    if (isOpen) {
      gsap.to(sidebarRef.current, {
        width: 320,
        duration: 0.4,
        ease: 'power2.out',
      });
      gsap.to(contentRef.current, {
        opacity: 1,
        pointerEvents: 'auto',
        duration: 0.3,
        delay: 0.1,
      });
    } else {
      gsap.to(contentRef.current, {
        opacity: 0,
        pointerEvents: 'none',
        duration: 0.2,
      });
      gsap.to(sidebarRef.current, {
        width: 0,
        duration: 0.4,
        ease: 'power2.inOut',
      });
    }
  }, [isOpen]);

  return (
    <div
      ref={sidebarRef}
      className="relative flex h-full shrink-0 flex-col border-r border-brand-border bg-white z-20"
      style={{ width: 320 }}
    >
      {/* Content Wrapper that clips when collapsed */}
      <div className="overflow-hidden w-full h-full">
        <div
          ref={contentRef}
          className="flex h-full w-[320px] flex-col p-4 flex-shrink-0"
        >
          {/* Header & Search */}
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-brand-text-primary uppercase tracking-wider">
                My Drafts
              </h2>
              <Link
                href="/editor"
                className="p-1.5 text-brand-text-secondary hover:text-brand-text-primary hover:bg-brand-hover rounded transition-colors"
                title="Start New Draft"
              >
                <PenSquare className="w-4 h-4" />
              </Link>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-text-secondary" />
              <input
                type="text"
                placeholder="Search drafts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-brand-surface border border-brand-border rounded-md text-sm text-brand-text-primary placeholder:text-brand-text-secondary focus:outline-none focus:ring-1 focus:ring-brand-text-primary transition-all"
              />
            </div>
          </div>

          {/* Drafts List */}
          <div id="drafts-sidebar-scroll-container" className="flex-1 overflow-y-auto pr-2 -mr-2">
            <div className="flex flex-col space-y-2">
            {loading && (
              <div data-testid="sidebar-loading" className="flex flex-col items-center justify-center h-32 text-brand-text-secondary">
                <div className="w-6 h-6 border-2 border-brand-border border-t-brand-text-secondary rounded-full animate-spin mb-2" />
                <p className="text-xs">Loading drafts...</p>
              </div>
            )}
            {!loading && error && (
              <div className="flex items-center justify-center h-32 text-xs text-brand-red text-center px-4 bg-brand-red/5 rounded-md border border-brand-red/10">
                {error}
              </div>
            )}
            {!loading && !error && visibleDrafts.length === 0 && (
              <div className="flex flex-col items-center justify-center h-32 text-brand-text-secondary">
                <FileText className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-sm text-center px-4">
                  {search.trim() !== '' ? 'No matching drafts found.' : 'No editable drafts found.'}
                </p>
              </div>
            )}
            {!loading && !error && visibleDrafts.length > 0 && (
              visibleDrafts.map((article) => {
                const isActive = article.id === currentArticleId;
                const isRejected = article.status === 'Unpublished';
                const displayStatus = isRejected ? 'Rejected' : article.status;
                const dateLabel = 'Updated';
                const hasTags = article.tags && article.tags.length > 0;

                return (
                  <Link
                    key={article.id}
                    href={`/editor/${article.id}`}
                    className={cn(
                      "block p-3 rounded-lg border transition-all duration-200",
                      isActive
                        ? "bg-brand-hover border-brand-text-primary shadow-sm"
                        : "bg-white border-brand-border hover:border-brand-text-primary/30 hover:shadow-sm"
                    )}
                  >
                    <div className="flex flex-col gap-1.5">
                      <h3 className={cn(
                        "font-medium text-sm line-clamp-2",
                        isActive ? "text-brand-text-primary" : "text-brand-text-primary/90"
                      )}>
                        {article.title || 'Untitled Draft'}
                      </h3>
                      
                      <div className="flex items-center justify-between text-[11px] text-brand-text-secondary">
                        <div className="flex items-center gap-1.5">
                          <StatusBadge status={displayStatus as import('@/lib/api/articles').ArticleStatus} />
                          <span>
                            {dateLabel} {article.updatedAt ? formatDate(article.updatedAt) : ''}
                          </span>
                        </div>
                      </div>
                      
                      {hasTags && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {article.tags.slice(0, 1).map(tag => (
                            <span key={tag} className="text-[10px] bg-brand-surface px-1.5 py-0.5 rounded text-brand-text-secondary">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })
            )}
            </div>
          </div>
        </div>
      </div>

      {/* Toggle Button positioned on the edge, translating dynamically to stay visible */}
      <button
        onClick={toggleSidebar}
        className="absolute top-6 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-brand-border bg-white text-brand-text-secondary shadow-md hover:text-brand-text-primary hover:bg-brand-hover transition-all duration-300"
        style={{
          left: '100%',
          transform: isOpen ? 'translateX(-50%)' : 'translateX(25%)',
        }}
      >
        {isOpen ? (
          <ChevronLeft className="h-6 w-6" />
        ) : (
          <ChevronRight className="h-6 w-6" />
        )}
      </button>
    </div>
  );
}
