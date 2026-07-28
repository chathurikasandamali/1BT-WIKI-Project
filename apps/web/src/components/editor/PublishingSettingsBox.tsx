'use client';

import React from 'react';
import { Clock, FileText, Hash } from 'lucide-react';
import { useEditorDraft } from '@/components/editor/EditorDraftContext';
import { cn } from '@/lib/utils';

export function PublishingSettingsBox() {
  const { wordCount, charCount, lastSavedAt, articleId } = useEditorDraft();

  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  const formatLastModified = () => {
    if (!lastSavedAt) return 'Not saved yet';
    return lastSavedAt.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="rounded-xl border border-brand-border bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-widest text-brand-text-secondary">
          Publishing Settings
        </h3>
        <span className="rounded border border-brand-text-secondary/30 bg-brand-bg px-2 py-0.5 text-[10px] font-bold text-brand-text-secondary uppercase tracking-wider">
          Draft
        </span>
      </div>

      {/* Draft Status Box */}
      <div className="mb-8 rounded-lg bg-brand-bg p-5 border border-brand-border">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-bold text-brand-text-primary uppercase tracking-wider">
            Draft Status
          </span>
          <span
            className={cn(
              'text-sm font-bold',
              articleId ? 'text-green-500' : 'text-gray-400'
            )}
          >
            {articleId ? 'Saved' : 'New'}
          </span>
        </div>
        <p className="text-xs text-brand-text-secondary leading-relaxed mt-2">
          {articleId
            ? 'Your draft has been saved to the server. Changes are auto-saved after 3 seconds of inactivity.'
            : 'Start writing to create a new draft. The draft will be saved when you set a title or upload an image.'}
        </p>
      </div>

      {/* Stats List */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-brand-text-secondary">
            <FileText className="h-4 w-4" />
            <span className="text-sm font-medium">Words count</span>
          </div>
          <span className="text-sm font-bold text-brand-text-primary">
            {wordCount}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-brand-text-secondary">
            <Hash className="h-4 w-4" />
            <span className="text-sm font-medium">Characters count</span>
          </div>
          <span className="text-sm font-bold text-brand-text-primary">
            {charCount}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-brand-text-secondary">
            <Clock className="h-4 w-4 text-brand-red" />
            <span className="text-sm font-medium">Estimated Read Time</span>
          </div>
          <span className="text-sm font-bold text-brand-text-primary">
            {readTime} min
          </span>
        </div>

        <div className="pt-4 border-t border-brand-border flex items-center justify-between">
          <span className="text-sm font-medium text-brand-text-secondary">
            Last Modified
          </span>
          <span className="text-sm font-bold text-brand-text-primary">
            {formatLastModified()}
          </span>
        </div>
      </div>
    </div>
  );
}
