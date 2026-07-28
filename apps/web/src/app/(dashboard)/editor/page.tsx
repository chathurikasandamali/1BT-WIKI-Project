'use client';

import React, { useState } from 'react';
import { useLenisScroll } from '@/lib/hooks/useLenisScroll';
import { EditorDraftProvider } from '@/components/editor/EditorDraftContext';
import { EditorHeader } from '@/components/editor/EditorHeader';
import { DraftManagerSidebar } from '@/components/editor/DraftManagerSidebar';
import { ComposerView } from '@/components/editor/ComposerView';
import { ReadingPreview } from '@/components/editor/ReadingPreview';
import { ImageEmbedModal } from '@/components/editor/ImageEmbedModal';

export default function EditorWorkspacePage() {
  const [mode, setMode] = useState<'compose' | 'preview'>('compose');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  useLenisScroll('editor-scroll-container');

  return (
    <EditorDraftProvider>
      <div className="flex h-screen w-full flex-col overflow-hidden bg-brand-bg">
        <EditorHeader mode={mode} setMode={setMode} />

        <div className="flex flex-1 overflow-hidden">
          <DraftManagerSidebar
            isOpen={isSidebarOpen}
            toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          />

          <main
            className="flex-1 overflow-y-auto relative z-0"
            id="editor-scroll-container"
          >
            <div className="min-h-full">
              {mode === 'compose' ? (
                <ComposerView
                  onOpenImageEmbed={() => setIsImageModalOpen(true)}
                />
              ) : (
                <ReadingPreview />
              )}
            </div>
          </main>
        </div>

        <ImageEmbedModal
          isOpen={isImageModalOpen}
          onClose={() => setIsImageModalOpen(false)}
        />
      </div>
    </EditorDraftProvider>
  );
}
