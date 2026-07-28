'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useLenisScroll } from '@/lib/hooks/useLenisScroll';
import { EditorDraftProvider } from '@/components/editor/EditorDraftContext';
import { EditorHeader } from '@/components/editor/EditorHeader';
import { DraftManagerSidebar } from '@/components/editor/DraftManagerSidebar';
import { ComposerView } from '@/components/editor/ComposerView';
import { ReadingPreview } from '@/components/editor/ReadingPreview';
import { ImageEmbedModal } from '@/components/editor/ImageEmbedModal';
import { apiFetch } from '@/lib/api/client';
import { Toast } from '@/components/shared/Toast';
import type { ArticleResponse } from '@/components/editor/EditorDraftContext';

export default function EditArticlePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [mode, setMode] = useState<'compose' | 'preview'>('compose');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [article, setArticle] = useState<ArticleResponse | null>(null);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useLenisScroll(!loading && article ? 'editor-scroll-container' : null);

  useEffect(() => {
    let cancelled = false;

    // IMPORTANT: Reset state immediately when `id` changes (client-side navigation)
    setLoading(true);
    setArticle(null);
    setToastVisible(false);
    
    async function fetchArticle() {
      try {
        const result = await apiFetch<ArticleResponse>(`/articles/${id}`);
        if (!cancelled) {
          setArticle(result.data!);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (cancelled) return;

        // Handle 404 / 403 based on backend error strings
        const msg = err instanceof Error ? err.message : String(err);
        if (msg === 'Article not found') {
          setToastMessage('Article not found.');
        } else if (
          msg === 'Article not available' ||
          msg.includes('Authentication failed')
        ) {
          setToastMessage('You cannot edit this article.');
        } else {
          setToastMessage('Failed to load article.');
        }

        setToastVisible(true);
        setTimeout(() => {
          if (!cancelled) {
            router.push('/my-articles');
          }
        }, 2000);
      }
    }

    fetchArticle();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  if (loading || !article) {
    return (
      <div className="flex h-screen w-full flex-col overflow-hidden bg-brand-bg items-center justify-center">
        <div className="text-brand-text-secondary">Loading article...</div>
        <Toast visible={toastVisible} message={toastMessage} type="error" />
      </div>
    );
  }

  return (
    <EditorDraftProvider key={article.id} initialArticle={article}>
      <div className="flex h-screen w-full flex-col overflow-hidden bg-brand-bg">
        <EditorHeader mode={mode} setMode={setMode} />

        <div className="flex flex-1 overflow-hidden">
          <DraftManagerSidebar
            isOpen={isSidebarOpen}
            toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            currentArticleId={id}
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
