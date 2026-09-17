'use client';

import React, { useState, useEffect } from 'react';
import gsap from 'gsap';
import Image from 'next/image';
import { Monitor, Tablet, Smartphone } from 'lucide-react';
import { ArticleContent } from '@/components/article-detail/ArticleContent';
import { useEditorDraft } from '@/components/editor/EditorDraftContext';
import { UserAvatar } from '@/components/UserAvatar';
import { useUser } from '@/lib/hooks/useUser';
import { cn } from '@/lib/utils';

export function ReadingPreview(): React.JSX.Element {
  const { title, tags, currentBody, featuredImageUrl } = useEditorDraft();
  const { user } = useUser();
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>(
    'desktop'
  );

  useEffect(() => {
    gsap.fromTo(
      '.preview-container',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
    );
  }, []);

  const getViewportWidth = (): string => {
    switch (viewport) {
      case 'mobile':
        return 'max-w-sm';
      case 'tablet':
        return 'max-w-2xl';
      default:
        return 'max-w-4xl';
    }
  };

  return (
    <div className="flex h-full flex-col bg-brand-bg pb-20">
      {/* Simulator Toolbar */}
      <div className="sticky top-0 z-10 flex justify-center border-b border-brand-border bg-white py-3 shadow-sm">
        <div className="flex rounded-lg border border-brand-border bg-brand-bg p-1">
          <button
            onClick={() => setViewport('desktop')}
            className={cn(
              'flex items-center gap-2 rounded px-4 py-1.5 text-sm font-semibold transition-colors',
              viewport === 'desktop'
                ? 'bg-white text-brand-text-primary shadow-sm'
                : 'text-brand-text-secondary hover:text-brand-text-primary'
            )}
          >
            <Monitor className="h-4 w-4" /> Desktop
          </button>
          <button
            onClick={() => setViewport('tablet')}
            className={cn(
              'flex items-center gap-2 rounded px-4 py-1.5 text-sm font-semibold transition-colors',
              viewport === 'tablet'
                ? 'bg-white text-brand-text-primary shadow-sm'
                : 'text-brand-text-secondary hover:text-brand-text-primary'
            )}
          >
            <Tablet className="h-4 w-4" /> Tablet
          </button>
          <button
            onClick={() => setViewport('mobile')}
            className={cn(
              'flex items-center gap-2 rounded px-4 py-1.5 text-sm font-semibold transition-colors',
              viewport === 'mobile'
                ? 'bg-white text-brand-text-primary shadow-sm'
                : 'text-brand-text-secondary hover:text-brand-text-primary'
            )}
          >
            <Smartphone className="h-4 w-4" /> Mobile
          </button>
        </div>
      </div>

      {/* Simulator Canvas */}
      <div className="flex-1 overflow-y-auto py-10 px-4 flex justify-center preview-container">
        <article
          className={cn(
            'w-full rounded-2xl bg-white shadow-xl border border-brand-border overflow-hidden transition-all duration-500 ease-out',
            getViewportWidth()
          )}
        >
          {/* Header Image */}
          {featuredImageUrl && (
            <Image
              src={featuredImageUrl}
              alt="Article cover"
              width={1200}
              height={400}
              unoptimized
              className="h-64 w-full object-cover"
            />
          )}

          <div className="p-10 md:p-14">
            {tags.length > 0 && (
              <div className="mb-6 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-brand-bg px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-text-secondary"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Title */}
            <h1 className="font-display text-4xl md:text-5xl font-bold text-brand-text-primary leading-tight mb-8">
              {title.trim() || 'Untitled Draft'}
            </h1>

            {/* Author Meta Row */}
            <div className="flex items-center gap-4 mb-10 border-b border-brand-border pb-8">
              <UserAvatar
                format="detail"
                name={user?.name}
                avatarUrl={user?.avatarUrl}
              />
              <div>
                <p className="font-bold text-brand-text-primary">
                  {user?.name || 'Unknown Author'}
                </p>
                <p className="text-sm text-brand-text-secondary">
                  Draft preview
                </p>
              </div>
            </div>

            <ArticleContent body={currentBody} />
          </div>
        </article>
      </div>
    </div>
  );
}
