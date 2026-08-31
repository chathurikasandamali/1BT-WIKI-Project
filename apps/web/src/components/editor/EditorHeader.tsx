'use client';

import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useEditorDraft } from '@/components/editor/EditorDraftContext';
import { getStatusDotColor, getStatusText } from '@/lib/utils/saveStatus';
import { BRAND_NAME, BRAND_SUB_NAME } from '@/lib/constants/brand';
import { cn } from '@/lib/utils';
import {
  useAutoDismissToast,
  DRAFT_SAVED_MESSAGE,
} from '@/lib/hooks/useAutoDismissToast';
import { Toast } from '@/components/shared/Toast';
import { ConfirmationModal } from '@/components/shared/ConfirmationModal';
import { GenerateQuizModal } from '@/components/quiz/GenerateQuizModal';
import { EditIcon } from '@/components/shared/icons/EditIcon';
import { EyeIcon } from '@/components/shared/icons/EyeIcon';

interface EditorHeaderProps {
  mode: 'compose' | 'preview';
  setMode: (mode: 'compose' | 'preview') => void;
}

export function EditorHeader({ mode, setMode }: EditorHeaderProps) {
  const router = useRouter();
  const {
    articleId,
    articleStatus,
    initialStatus,
    title,
    wordCount,
    saveStatus,
    lastSavedAt,
    lastError,
    saveDraft,
    submitForReview,
    validate,
  } = useEditorDraft();
  const statusDotRef = useRef<HTMLDivElement>(null);
  const {
    isVisible: isToastVisible,
    message: toastMessage,
    showToast,
  } = useAutoDismissToast();

  const [isConfirmModalOpen, setIsConfirmModalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [toastType, setToastType] = React.useState<'success' | 'error'>(
    'success'
  );
  const [isGenerateQuizModalOpen, setIsGenerateQuizModalOpen] =
    React.useState(false);
  const [canGenerateQuiz, setCanGenerateQuiz] =
    React.useState(false);

  // React.useEffect(() => {
  //   if(articleId && title && wordCount > 100) {
  //     setCanGenerateQuiz(true);
  //   } else {
  //     setCanGenerateQuiz(false);
  //   }
  // }, []);

  React.useMemo(() => {
    console.log('articleId:', articleId, 'title:', title, 'wordCount:', wordCount);
    if(articleId && title && wordCount > 100) {
      setCanGenerateQuiz(true);
    } else {
      setCanGenerateQuiz(false);
    }
  }, [articleId, title, wordCount]);

  // Animate the status dot based on save state
  useGSAP(() => {
    if (!statusDotRef.current) return;

    gsap.killTweensOf(statusDotRef.current);

    if (saveStatus === 'saving') {
      gsap.to(statusDotRef.current, {
        opacity: 0.4,
        scale: 1.3,
        duration: 0.5,
        repeat: -1,
        yoyo: true,
        ease: 'power1.inOut',
      });
    } else if (saveStatus === 'saved') {
      gsap.to(statusDotRef.current, {
        opacity: 0.4,
        scale: 1.2,
        duration: 1,
        repeat: -1,
        yoyo: true,
        ease: 'power1.inOut',
      });
    } else {
      // idle or error — no pulse
      gsap.set(statusDotRef.current, { opacity: 1, scale: 1 });
    }
  }, [saveStatus]);

  const handleSaveDraft = async () => {
    if (!validate()) {
      setToastType('error');
      showToast('Please fix the highlighted errors before saving.');
      return;
    }
    try {
      await saveDraft();
      setToastType('success');
      showToast(DRAFT_SAVED_MESSAGE);
    } catch {
      // Error state is already set in context
    }
  };

  const handleSubmitForReview = async () => {
    if (!validate()) {
      setToastType('error');
      showToast('Please fix the highlighted errors before submitting.');
      return;
    }
    setIsSubmitting(true);
    try {
      await submitForReview();
      setIsConfirmModalOpen(false);
      setToastType('success');
      showToast('Article submitted for review successfully.');
      router.push('/my-articles');
    } catch {
      setIsConfirmModalOpen(false);
      setToastType('error');
      showToast(lastError || 'Failed to submit article for review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenConfirmModal = () => {
    if (!validate()) {
      setToastType('error');
      showToast('Please fix the highlighted errors before submitting.');
      return;
    }
    setIsConfirmModalOpen(true);
  };

  const handleGenerateQuizClick = () => {
    setIsGenerateQuizModalOpen(true);
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/my-articles');
    }
  };

  const isSaving = saveStatus === 'saving';
  const isPublished =
    articleStatus !== null &&
    articleStatus !== 'Draft' &&
    articleStatus !== 'Rejected';
  const submitLabel =
    initialStatus === 'Rejected' ? 'Re-submit for Review' : 'Submit for Review';

  return (
    <>
      <header className="flex h-16 w-full items-center justify-between border-b border-brand-border bg-white px-6 shrink-0 relative z-20 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 border-r border-brand-border pr-6">
            <Link 
              href="/"
              className="flex items-center gap-1.5 flex-shrink-0 hover:opacity-80 transition-opacity"
              aria-label="1BT Wiki home"
            >
              <div className="h-10 w-10 bg-brand-red rounded flex items-center justify-center flex-shrink-0 shadow-sm">
                <span className="text-white text-xs font-black leading-none">
                  {BRAND_NAME}
                </span>
              </div>
              <span className="text-brand-text-secondary font-semibold text-base leading-none tracking-tight">
                {BRAND_SUB_NAME}
              </span>
            </Link>
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Editor Workspace
              </span>
            </div>
          </div>

          <button 
            type="button"
            onClick={handleBack}
            aria-label="Go back"
            className="flex h-8 items-center justify-center gap-1.5 rounded px-2 text-brand-text-secondary hover:bg-brand-hover hover:text-brand-text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span className="text-sm font-medium hidden sm:inline">Back</span>
          </button>

          <div className="flex items-center gap-2 rounded-full border border-brand-border bg-brand-bg px-3 py-1">
            <div
              ref={statusDotRef}
              className={cn(
                'h-2 w-2 rounded-full',
                getStatusDotColor(saveStatus)
              )}
            />
            <span
              data-cy="save-status-indicator"
              className="text-xs font-medium text-brand-text-secondary max-w-[200px] truncate"
              title={
                saveStatus === 'error' && lastError ? lastError : undefined
              }
            >
              {getStatusText(saveStatus, lastSavedAt)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Mode Toggles */}
          <div className="flex rounded-lg border border-brand-border bg-white p-1 shadow-sm">
            <button
              type='button'
              onClick={() => setMode('compose')}
              className={cn(
                'flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-semibold transition-colors',
                mode === 'compose'
                  ? 'bg-red-50 text-brand-red'
                  : 'text-brand-text-secondary hover:bg-brand-hover hover:text-brand-text-primary'
              )}
            >
              <EditIcon className="h-4 w-4" />
              Compose
            </button>
            <button
              type='button'
              onClick={() => setMode('preview')}
              className={cn(
                'flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-semibold transition-colors',
                mode === 'preview'
                  ? 'bg-gray-100 text-brand-text-primary'
                  : 'text-brand-text-secondary hover:bg-brand-hover hover:text-brand-text-primary'
              )}
            >
              <EyeIcon className="h-4 w-4" />
              Preview
            </button>
          </div>

          {/* Save Draft button (Correction 3: replaces the removed "Revert to Draft") */}
          <button
            type="button"
            data-cy="save-draft-button"
            onClick={handleSaveDraft}
            disabled={saveStatus === 'saving'}
            className="flex items-center gap-2 rounded-lg border border-brand-border bg-white px-4 py-2 text-sm font-semibold text-brand-text-primary hover:bg-brand-hover transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4 text-brand-text-secondary" />
            Save Draft
          </button>

          <button
            type="button"
            data-cy="generate-quiz-button"
            onClick={handleGenerateQuizClick}
            disabled={!canGenerateQuiz}
            title={
              canGenerateQuiz
                ? undefined
                : 'Add a title and some content, then save, before generating a quiz'
            }
            className="flex items-center gap-2 rounded-lg border border-brand-border bg-white px-4 py-2 text-sm font-semibold text-brand-text-primary hover:bg-brand-hover transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="h-4 w-4 text-brand-text-secondary" />
            Generate Quiz
          </button>

          <button
            type="button"
            data-cy="submit-for-review-button"
            onClick={handleOpenConfirmModal}
            disabled={isSaving || isPublished}
            className="rounded-lg bg-brand-red px-5 py-2 text-sm font-bold text-white shadow-md hover:bg-brand-red-hover disabled:bg-brand-red-disabled transition-colors"
          >
            {submitLabel}
          </button>
        </div>
      </header>
      <Toast visible={isToastVisible} message={toastMessage} type={toastType} />
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        title={submitLabel}
        message="Are you sure you want to submit this article for review? It will be locked from further edits until a reviewer approves or rejects it."
        confirmText="Submit"
        onConfirm={handleSubmitForReview}
        onCancel={() => setIsConfirmModalOpen(false)}
        isConfirming={isSubmitting}
      />
      <GenerateQuizModal
        isOpen={isGenerateQuizModalOpen}
        articleId={articleId}
        onClose={() => setIsGenerateQuizModalOpen(false)}
      />
    </>
  );
}
