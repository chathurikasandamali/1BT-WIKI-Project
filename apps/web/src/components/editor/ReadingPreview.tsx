'use client';

import React, { useState, useEffect } from 'react';
import gsap from 'gsap';
import { Monitor, Tablet, Smartphone } from 'lucide-react';
import {
  MOCK_TAGS,
  MOCK_TITLE,
  MOCK_AUTHOR_INITIALS,
  MOCK_AUTHOR_NAME,
  MOCK_AUTHOR_META,
  MOCK_CONTENT_HTML,
} from '@/components/editor/mock';
import { cn } from '@/lib/utils';

export function ReadingPreview() {
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

  const getViewportWidth = () => {
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
          <div className="w-full h-64 bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600" />

          <div className="p-10 md:p-14">
            {/* Tags */}
            <div className="mb-6 flex gap-2">
              {MOCK_TAGS.map((tag) => (
                <span key={tag} className="font-bold text-brand-red text-sm">
                  {tag}
                </span>
              ))}
            </div>

            {/* Title */}
            <h1 className="font-display text-4xl md:text-5xl font-bold text-brand-text-primary leading-tight mb-8">
              {MOCK_TITLE}
            </h1>

            {/* Author Meta Row */}
            <div className="flex items-center gap-4 mb-10 border-b border-brand-border pb-8">
              <div className="h-12 w-12 rounded-full bg-brand-hover border-2 border-white shadow flex items-center justify-center text-brand-red font-bold">
                {MOCK_AUTHOR_INITIALS}
              </div>
              <div>
                <p className="font-bold text-brand-text-primary">
                  {MOCK_AUTHOR_NAME}
                </p>
                <p className="text-sm text-brand-text-secondary">
                  {MOCK_AUTHOR_META}
                </p>
              </div>
            </div>

            {/* Simulated Rich Text Content */}
            <div
              className="prose prose-lg max-w-none prose-headings:font-display prose-headings:font-bold prose-headings:text-brand-text-primary prose-p:text-brand-text-primary prose-a:text-brand-red"
              dangerouslySetInnerHTML={{ __html: MOCK_CONTENT_HTML }}
            />
          </div>
        </article>
      </div>
    </div>
  );
}
