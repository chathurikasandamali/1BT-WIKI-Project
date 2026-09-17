'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { fetchPublishedArticles, type PublishedArticleListItem } from '@/lib/api/articles';
import { fetchPublishedTechTalks, type TechTalkListItem } from '@/lib/api/techTalks';
import { ArticleIcon } from '@/components/shared/icons/ArticleIcon';
import { TechTalkIcon } from '@/components/shared/icons/TechTalkIcon';
import { SearchIcon } from '@/components/shared/icons/SearchIcon';
import { SpinnerIcon } from '@/components/shared/icons/SpinnerIcon';
import { cn } from '@/lib/utils';

// Debounce delay before firing the search request — short enough to feel
// instant, long enough to avoid a request per keystroke.
const SEARCH_DEBOUNCE_MS = 300;
// Keep the dropdown compact — this is a quick-jump preview, not a full
// results page (the dedicated Articles/Tech Talks pages own that).
const RESULTS_LIMIT_PER_TYPE = 5;

interface HeaderSearchProps {
  /** Unique id for the input — also namespaces the results listbox id. */
  id: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  /** Pre-fills the input, e.g. from a `?search=` URL param already applied elsewhere. */
  initialValue?: string;
  /** Called on Enter/form-submit with the trimmed query. Omit to disable submit-navigation. */
  onSubmit?: (trimmedQuery: string) => void;
  /** Called after a result is clicked (e.g. to close a mobile menu). */
  onNavigate?: () => void;
}

/** Derives a YouTube thumbnail URL so Tech Talks get a real image without any backend change. */
function getYoutubeThumbnailUrl(youtubeVideoId: string | null): string | null {
  return youtubeVideoId
    ? `https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`
    : null;
}

export function HeaderSearch({
  id,
  placeholder = 'Search articles and tech talks',
  className,
  inputClassName,
  initialValue = '',
  onSubmit,
  onNavigate,
}: HeaderSearchProps): React.JSX.Element {
  const [query, setQuery] = useState(initialValue);
  const [articles, setArticles] = useState<PublishedArticleListItem[]>([]);
  const [techTalks, setTechTalks] = useState<TechTalkListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guards against a slower, stale request overwriting a faster, newer one.
  const requestIdRef = useRef(0);

  // Keep the input in sync if the caller's initial value changes externally
  // (e.g. navigating back to a page whose URL already carries `?search=`).
  useEffect(() => {
    setQuery(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
    }

    if (trimmedQuery === '') {
      requestIdRef.current += 1;
      setArticles([]);
      setTechTalks([]);
      setLoading(false);
      setErrorMessage(null);
      return;
    }

    debounceRef.current = setTimeout(() => {
      const requestId = ++requestIdRef.current;
      setLoading(true);
      setErrorMessage(null);

      Promise.all([
        fetchPublishedArticles({
          search: trimmedQuery,
          limit: RESULTS_LIMIT_PER_TYPE,
        }),
        fetchPublishedTechTalks({
          search: trimmedQuery,
          limit: RESULTS_LIMIT_PER_TYPE,
        }),
      ])
        .then(([articleResult, techTalkResult]) => {
          if (requestId !== requestIdRef.current) return;
          setArticles(articleResult.articles);
          setTechTalks(techTalkResult.techTalks);
        })
        .catch((error: unknown) => {
          if (requestId !== requestIdRef.current) return;
          setArticles([]);
          setTechTalks([]);
          setErrorMessage(
            error instanceof Error ? error.message : 'Failed to search'
          );
        })
        .finally(() => {
          if (requestId === requestIdRef.current) setLoading(false);
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent): void {
      if (event.key === 'Escape') setIsOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery !== '';
  const hasResults = articles.length > 0 || techTalks.length > 0;
  const showDropdown = isOpen && hasQuery;
  const resultsId = `${id}-results`;

  function handleChange(event: React.ChangeEvent<HTMLInputElement>): void {
    setQuery(event.target.value);
    setIsOpen(true);
  }

  function handleFocus(): void {
    if (hasQuery) setIsOpen(true);
  }

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setIsOpen(false);
    onSubmit?.(trimmedQuery);
  }

  function handleResultClick(): void {
    setIsOpen(false);
    onNavigate?.();
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <form onSubmit={handleFormSubmit}>
        <label className="relative block" htmlFor={id}>
          <span className="sr-only">Search articles and tech talks</span>
          <SearchIcon
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-text-secondary"
            aria-hidden="true"
          />
          <input
            id={id}
            type="search"
            role="combobox"
            aria-expanded={showDropdown}
            aria-controls={resultsId}
            aria-autocomplete="list"
            autoComplete="off"
            value={query}
            onChange={handleChange}
            onFocus={handleFocus}
            placeholder={placeholder}
            data-testid="header-search-input"
            className={cn(
              'h-11 w-full rounded-full border border-brand-border bg-brand-bg pl-11 pr-4 text-sm text-brand-text-primary placeholder:text-brand-text-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red/30 focus-visible:border-brand-red',
              inputClassName
            )}
          />
        </label>
      </form>

      {showDropdown && (
        <div
          id={resultsId}
          role="listbox"
          data-testid="header-search-results"
          className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-lg border border-brand-border bg-white p-2 shadow-lg"
        >
          {loading && (
            <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-brand-text-secondary">
              <SpinnerIcon className="h-4 w-4 animate-spin" aria-hidden="true" />
              Searching...
            </div>
          )}

          {!loading && errorMessage && (
            <div className="px-4 py-6 text-center text-sm text-brand-red">
              {errorMessage}
            </div>
          )}

          {!loading && !errorMessage && !hasResults && (
            <div className="px-4 py-6 text-center text-sm text-brand-text-secondary">
              No results found for &quot;{trimmedQuery}&quot;.
            </div>
          )}

          {!loading && !errorMessage && articles.length > 0 && (
            <div className="mb-1">
              <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-text-secondary">
                Articles
              </p>
              {articles.map((article) => (
                <Link
                  key={article.id}
                  href={`/articles/${article.id}`}
                  onClick={handleResultClick}
                  data-testid="header-search-result-article"
                  className="flex items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-brand-hover"
                >
                  <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-brand-dark">
                    {article.coverImageUrl ? (
                      <Image
                        src={article.coverImageUrl}
                        alt=""
                        fill
                        unoptimized
                        sizes="40px"
                        className="object-cover"
                      />
                    ) : (
                      <ArticleIcon
                        className="h-4 w-4 text-white/70"
                        aria-hidden="true"
                      />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-brand-text-primary">
                      {article.title}
                    </span>
                    <span className="block truncate text-xs text-brand-text-secondary">
                      By {article.authorName}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}

          {!loading && !errorMessage && techTalks.length > 0 && (
            <div>
              <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-text-secondary">
                Tech Talks
              </p>
              {techTalks.map((techTalk) => {
                const thumbnailUrl = getYoutubeThumbnailUrl(
                  techTalk.youtubeVideoId
                );

                return (
                  <Link
                    key={techTalk.id}
                    href={`/tech-talks/${techTalk.id}`}
                    onClick={handleResultClick}
                    data-testid="header-search-result-techtalk"
                    className="flex items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-brand-hover"
                  >
                    <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-brand-dark">
                      {thumbnailUrl ? (
                        <Image
                          src={thumbnailUrl}
                          alt=""
                          fill
                          unoptimized
                          sizes="40px"
                          className="object-cover"
                        />
                      ) : (
                        <TechTalkIcon
                          className="h-4 w-4 text-white/70"
                          aria-hidden="true"
                        />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-brand-text-primary">
                        {techTalk.title}
                      </span>
                      <span className="block truncate text-xs text-brand-text-secondary">
                        By {techTalk.presenters.join(', ') || 'Unknown'}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
