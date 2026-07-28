'use client';

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import type { Editor } from '@tiptap/react';
import { apiFetch } from '@/lib/api/client';

// ── Frontend types matching backend response shape ──────────────────────────

export interface ArticleAttachment {
  id: string;
  articleId: string;
  uploadedBy: string;
  fileName: string;
  b2FileKey: string;
  b2FileId: string;
  b2BucketName: string;
  fileUrl: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  deletedAt: string | null;
}

export interface ArticleResponse {
  id: string;
  title: string;
  body: Record<string, unknown>;
  status: string;
  authorId: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  attachments?: ArticleAttachment[];
  warnings?: string[];
}

// ── Context value shape ─────────────────────────────────────────────────────

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface EditorDraftContextValue {
  // State
  articleId: string | null;
  articleStatus: string | null;
  title: string;
  tags: string[];
  saveStatus: SaveStatus;
  lastSavedAt: Date | null;
  lastError: string | null;
  featuredImageUrl: string | null;
  attachments: ArticleAttachment[];
  wordCount: number;
  charCount: number;
  initialBody: Record<string, unknown> | null;
  initialStatus: string | null;

  // Setters
  setTitle: (title: string) => void;
  setTags: (tags: string[]) => void;
  setFeaturedImageUrl: (url: string | null) => void;

  // Editor registration
  registerEditor: (editor: Editor | null) => void;

  // Draft operations
  ensureDraftExists: () => Promise<string>;
  saveDraft: () => Promise<void>;
  uploadImage: (file: File) => Promise<string>;
  submitForReview: () => Promise<void>;

  // Editor helpers
  insertEditorImage: (src: string) => void;
  handleTitleBlur: () => void;
  notifyContentChanged: (wordCount: number, charCount: number) => void;
}

// ── Context & hook ──────────────────────────────────────────────────────────

const EditorDraftContext = createContext<EditorDraftContextValue | undefined>(
  undefined
);

export function useEditorDraft(): EditorDraftContextValue {
  const ctx = useContext(EditorDraftContext);
  if (!ctx) {
    throw new Error(
      'useEditorDraft must be used within an EditorDraftProvider'
    );
  }
  return ctx;
}

// ── Provider ────────────────────────────────────────────────────────────────

export function EditorDraftProvider({
  children,
  initialArticle,
}: {
  children: ReactNode;
  initialArticle?: ArticleResponse;
}) {
  // ── Reactive state ──
  const [articleId, setArticleId] = useState<string | null>(
    initialArticle?.id ?? null
  );
  const [articleStatus, setArticleStatus] = useState<string | null>(
    initialArticle?.status ?? null
  );
  const [title, setTitleState] = useState(initialArticle?.title ?? '');
  const [tags, setTagsState] = useState<string[]>(initialArticle?.tags ?? []);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [featuredImageUrl, setFeaturedImageUrl] = useState<string | null>(null);
  const [attachments, setAttachmentsState] = useState<ArticleAttachment[]>(
    initialArticle?.attachments ?? []
  );
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [contentChangeCounter, setContentChangeCounter] = useState(0);

  // ── Mirror refs (for reading current values in async callbacks without
  //    stale closures — state setters from useState are stable, but the
  //    state *values* captured in closures go stale) ──
  const articleIdRef = useRef<string | null>(initialArticle?.id ?? null);
  const titleRef = useRef(initialArticle?.title ?? '');
  const tagsRef = useRef<string[]>(initialArticle?.tags ?? []);
  const editorRef = useRef<Editor | null>(null);
  const attachmentsRef = useRef<ArticleAttachment[]>(
    initialArticle?.attachments ?? []
  );
  const initialBodyRef = useRef<Record<string, unknown> | null>(
    initialArticle?.body ?? null
  );
  const initialStatusRef = useRef<string | null>(
    initialArticle?.status ?? null
  );

  // ── Concurrency control (Correction 2) ──
  const creatingDraftRef = useRef<Promise<string> | null>(null);
  const pendingRequestRef = useRef<Promise<unknown> | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Simple setters (sync both state and mirror refs) ──

  const setTitle = useCallback((newTitle: string) => {
    setTitleState(newTitle);
    titleRef.current = newTitle;
  }, []);

  const setTags = useCallback((newTags: string[]) => {
    setTagsState(newTags);
    tagsRef.current = newTags;
  }, []);

  const registerEditor = useCallback((editor: Editor | null) => {
    editorRef.current = editor;
  }, []);

  const insertEditorImage = useCallback((src: string) => {
    const editor = editorRef.current;
    if (editor) {
      editor.chain().focus().setImage({ src }).run();
    }
  }, []);

  const notifyContentChanged = useCallback((words: number, chars: number) => {
    setWordCount(words);
    setCharCount(chars);
    setContentChangeCounter((c) => c + 1);
  }, []);

  // ── Request serialization lock (Correction 2) ─────────────────────────
  //
  // Every method that sends a POST or PATCH must go through this lock.
  // If a previous request is in flight, the new one awaits it first,
  // then starts its own. This serialises all writes through a single
  // promise chain so out-of-order responses cannot clobber fresher state.

  const withRequestLock = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> => {
      const prev = pendingRequestRef.current;

      const myPromise = (async () => {
        if (prev) {
          // Wait for the previous request to finish (don't let its failure
          // block us — we still want to proceed with our own request)
          try {
            await prev;
          } catch {
            /* swallow — error state is handled by the previous caller */
          }
        }
        return fn();
      })();

      pendingRequestRef.current = myPromise;

      try {
        return await myPromise;
      } finally {
        // Only clear if we are still the latest link in the chain
        if (pendingRequestRef.current === myPromise) {
          pendingRequestRef.current = null;
        }
      }
    },
    []
  );

  // ── ensureDraftExists ─────────────────────────────────────────────────
  //
  // Idempotent: if the draft already exists, returns its ID immediately.
  // Uses a mutex ref to prevent duplicate concurrent POSTs.

  const ensureDraftExists = useCallback(async (): Promise<string> => {
    // Fast path — draft already created
    if (articleIdRef.current) return articleIdRef.current;

    // Mutex — another caller already triggered the POST; reuse its promise
    if (creatingDraftRef.current) return creatingDraftRef.current;

    const promise = (async () => {
      return await withRequestLock(async () => {
        // Double-check after acquiring lock (another queued call may have
        // created the draft while we were waiting)
        if (articleIdRef.current) return articleIdRef.current;

        setSaveStatus('saving');

        const titleForCreate = titleRef.current.trim() || 'Untitled Draft';

        const formData = new FormData();
        formData.append(
          'data',
          JSON.stringify({
            title: titleForCreate,
            body: editorRef.current?.getJSON() ?? {},
            tags: tagsRef.current,
          })
        );

        try {
          const result = await apiFetch<ArticleResponse>('/articles', {
            method: 'POST',
            body: formData,
          });

          const id = result.data!.id;
          articleIdRef.current = id;
          setArticleId(id);
          setArticleStatus(result.data!.status);

          const returnedAttachments = result.data!.attachments ?? [];
          setAttachmentsState(returnedAttachments);
          attachmentsRef.current = returnedAttachments;

          setLastSavedAt(new Date());
          setSaveStatus('saved');
          setLastError(null);

          // BUG FIX: Persist the fallback title into state so subsequent PATCH requests
          // don't send an empty string. Only overwrite if the user hasn't typed
          // anything else while the request was in flight.
          if (!titleRef.current.trim()) {
            setTitle(titleForCreate);
          }

          return id;
        } catch (error) {
          setSaveStatus('error');
          const msg = error instanceof Error ? error.message : String(error);
          setLastError(msg);
          throw error;
        }
      });
    })();

    creatingDraftRef.current = promise;
    try {
      return await promise;
    } finally {
      creatingDraftRef.current = null;
    }
  }, [withRequestLock, setTitle]);

  // ── saveDraft ─────────────────────────────────────────────────────────
  //
  // First call → POST (via ensureDraftExists). Subsequent calls → PATCH.

  const saveDraft = useCallback(async (): Promise<void> => {
    // If no draft exists yet, create one first
    if (!articleIdRef.current) {
      await ensureDraftExists();
    }

    const id = articleIdRef.current;
    if (!id) return; // Should never happen after ensureDraftExists

    await withRequestLock(async () => {
      setSaveStatus('saving');

      // BUG FIX: Guard against sending an empty title on autosave/PATCH
      const safeTitle = titleRef.current.trim() || 'Untitled Draft';

      const formData = new FormData();
      formData.append(
        'data',
        JSON.stringify({
          title: safeTitle,
          body: editorRef.current?.getJSON() ?? {},
          tags: tagsRef.current,
        })
      );

      try {
        const result = await apiFetch<ArticleResponse>(`/articles/${id}`, {
          method: 'PATCH',
          body: formData,
        });

        if (result.data?.status) {
          setArticleStatus(result.data.status);
        }

        // Only update attachments if the response includes them
        // (PATCH without images returns attachments: undefined)
        if (result.data?.attachments) {
          // Merge: keep existing attachments, add any genuinely new ones
          const existingIds = new Set(attachmentsRef.current.map((a) => a.id));
          const trulyNew = result.data.attachments.filter(
            (a) => !existingIds.has(a.id)
          );
          const merged = [...attachmentsRef.current, ...trulyNew];
          setAttachmentsState(merged);
          attachmentsRef.current = merged;
        }

        setLastSavedAt(new Date());
        setSaveStatus('saved');
        setLastError(null);
      } catch (error) {
        setSaveStatus('error');
        const msg = error instanceof Error ? error.message : String(error);
        setLastError(msg);
        throw error;
      }
    });
  }, [ensureDraftExists, withRequestLock]);

  // ── uploadImage (Correction 1 — id-diffing) ──────────────────────────
  //
  // Triggers lazy-create if needed (trigger b), then PATCHes with the
  // file. Identifies the newly created attachment by diffing the
  // response's attachment IDs against a pre-call snapshot — never by
  // filename, which can collide.

  const uploadImage = useCallback(
    async (file: File): Promise<string> => {
      // Trigger (b): ensure a draft exists so we have an articleId
      await ensureDraftExists();

      const id = articleIdRef.current;
      if (!id) throw new Error('Failed to create draft for image upload');

      return await withRequestLock(async () => {
        setSaveStatus('saving');

        // Snapshot current attachment IDs BEFORE the request (Correction 1)
        const preUploadIds = new Set(attachmentsRef.current.map((a) => a.id));

        // BUG FIX: Guard against sending an empty title on upload PATCH
        const safeTitle = titleRef.current.trim() || 'Untitled Draft';

        const formData = new FormData();
        formData.append(
          'data',
          JSON.stringify({
            title: safeTitle,
            body: editorRef.current?.getJSON() ?? {},
            tags: tagsRef.current,
          })
        );
        formData.append('images', file);

        try {
          const result = await apiFetch<ArticleResponse>(`/articles/${id}`, {
            method: 'PATCH',
            body: formData,
          });

          if (result.data?.status) {
            setArticleStatus(result.data.status);
          }

          const returnedAttachments = result.data?.attachments ?? [];

          // Merge into state (handles both full-list and new-only responses)
          const existingIds = new Set(attachmentsRef.current.map((a) => a.id));
          const trulyNewForState = returnedAttachments.filter(
            (a) => !existingIds.has(a.id)
          );
          const merged = [...attachmentsRef.current, ...trulyNewForState];
          setAttachmentsState(merged);
          attachmentsRef.current = merged;

          setLastSavedAt(new Date());
          setSaveStatus('saved');
          setLastError(null);

          // Correction 1: find the genuinely new attachment by diffing IDs
          const newAttachments = returnedAttachments.filter(
            (a) => !preUploadIds.has(a.id)
          );

          if (newAttachments.length === 0) {
            throw new Error(
              'Image upload succeeded but no new attachment was returned'
            );
          }

          if (newAttachments.length > 1) {
            console.warn(
              `[EditorDraft] Unexpected: ${newAttachments.length} new attachments ` +
                'found after single-file upload. Using the last one.'
            );
          }

          // Take the last new attachment (safest if multiple unexpectedly appear)
          const newAttachment = newAttachments[newAttachments.length - 1]!;
          return newAttachment.fileUrl;
        } catch (error) {
          setSaveStatus('error');
          const msg = error instanceof Error ? error.message : String(error);
          setLastError(msg);
          throw error;
        }
      });
    },
    [ensureDraftExists, withRequestLock]
  );

  // ── submitForReview ───────────────────────────────────────────────────
  //
  // Submits the draft for review (transitions status from Draft to Pending).

  const submitForReview = useCallback(async (): Promise<void> => {
    if (!articleIdRef.current) {
      await ensureDraftExists();
    }

    const id = articleIdRef.current;
    if (!id) return;

    await withRequestLock(async () => {
      setSaveStatus('saving');

      try {
        const result = await apiFetch<ArticleResponse>(
          `/articles/${id}/submit`,
          {
            method: 'POST',
          }
        );

        if (result.data?.status) {
          setArticleStatus(result.data.status);
        }

        setLastSavedAt(new Date());
        setSaveStatus('saved');
        setLastError(null);
      } catch (error) {
        setSaveStatus('error');
        const msg = error instanceof Error ? error.message : String(error);
        setLastError(msg);
        throw error;
      }
    });
  }, [ensureDraftExists, withRequestLock]);

  // ── handleTitleBlur (trigger a) ───────────────────────────────────────

  const handleTitleBlur = useCallback(() => {
    if (titleRef.current.trim() && !articleIdRef.current) {
      ensureDraftExists().catch(() => {
        // Error state is already set inside ensureDraftExists
      });
    }
  }, [ensureDraftExists]);

  // ── Autosave (3-second debounce, hand-rolled, PATCH-only) ─────────────
  //
  // Watches title, tags, and contentChangeCounter. Only fires when a draft
  // already exists (articleId !== null) — never triggers a POST.

  useEffect(() => {
    // Only autosave if a draft already exists
    if (!articleId) return;

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      autosaveTimerRef.current = null;
      if (!articleIdRef.current) return;
      saveDraft().catch(() => {
        // Error state is already set inside saveDraft
      });
    }, 3000);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [title, tags, contentChangeCounter, articleId, saveDraft]);

  // ── Cleanup on unmount ────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, []);

  // ── Context value (memoised to avoid needless consumer re-renders) ────

  const value: EditorDraftContextValue = useMemo(
    () => ({
      articleId,
      articleStatus,
      title,
      tags,
      saveStatus,
      lastSavedAt,
      lastError,
      featuredImageUrl,
      attachments,
      wordCount,
      charCount,
      setTitle,
      setTags,
      setFeaturedImageUrl,
      registerEditor,
      ensureDraftExists,
      saveDraft,
      uploadImage,
      submitForReview,
      insertEditorImage,
      handleTitleBlur,
      notifyContentChanged,
      initialBody: initialBodyRef.current,
      initialStatus: initialStatusRef.current,
    }),
    [
      articleId,
      articleStatus,
      title,
      tags,
      saveStatus,
      lastSavedAt,
      lastError,
      featuredImageUrl,
      attachments,
      wordCount,
      charCount,
      setTitle,
      setTags,
      setFeaturedImageUrl,
      registerEditor,
      ensureDraftExists,
      saveDraft,
      uploadImage,
      submitForReview,
      insertEditorImage,
      handleTitleBlur,
      notifyContentChanged,
    ]
  );

  return (
    <EditorDraftContext.Provider value={value}>
      {children}
    </EditorDraftContext.Provider>
  );
}
