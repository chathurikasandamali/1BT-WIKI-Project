'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { X } from 'lucide-react';
import {
  generateQuiz,
  getFocusAspects,
  saveQuizAsFallback,
  setFocusAspects,
  type GenerateQuizResponse,
} from '@/lib/api/articles';
import { QuizQuestionCard } from '@/components/quiz/QuizQuestionCard';

const MAX_FOCUS_ASPECTS_LENGTH = 1000;

interface GenerateQuizModalProps {
  isOpen: boolean;
  articleId: string | null;
  onClose: () => void;
  /**
   * Reader-view mode: skips the focus-aspects input step and starts
   * generation as soon as the modal opens, showing only the result.
   */
  autoGenerate?: boolean;
}

type Step = 'input' | 'review' | 'saved';

export function GenerateQuizModal({
  isOpen,
  articleId,
  onClose,
  autoGenerate = false,
}: GenerateQuizModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  const [step, setStep] = useState<Step>('input');
  const [focusAspects, setFocusAspectsValue] = useState('');
  const [isLoadingAspects, setIsLoadingAspects] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateQuizResponse | null>(null);
  const autoStartedRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load the saved focus-aspects hint (if any) whenever the modal opens.
  useEffect(() => {
    if (!isOpen || !articleId || autoGenerate) return;

    let cancelled = false;
    setIsLoadingAspects(true);
    setError(null);
    setResult(null);
    setStep('input');

    getFocusAspects(articleId)
      .then((aspects) => {
        if (!cancelled) {
          setFocusAspectsValue(aspects ?? '');
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load focus aspects');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingAspects(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, articleId, autoGenerate]);

  useGSAP(() => {
    if (!mounted || !overlayRef.current || !modalRef.current) return;

    if (isOpen) {
      gsap.to(overlayRef.current, {
        opacity: 1,
        pointerEvents: 'auto',
        duration: 0.3,
      });
      gsap.fromTo(
        modalRef.current,
        { y: 30, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.2)' }
      );
    } else {
      gsap.to(overlayRef.current, {
        opacity: 0,
        pointerEvents: 'none',
        duration: 0.3,
      });
      gsap.to(modalRef.current, {
        y: 20,
        opacity: 0,
        scale: 0.95,
        duration: 0.3,
        ease: 'power2.in',
      });
    }
  }, [isOpen, mounted]);

  const handleClose = () => {
    if (isGenerating || isSaving) return;
    onClose();
    // Reset after the close animation has a chance to run.
    setTimeout(() => {
      setStep('input');
      setResult(null);
      setError(null);
      autoStartedRef.current = false;
    }, 300);
  };

  const handleGenerate = async () => {
    if (!articleId) return;

    setIsGenerating(true);
    setError(null);

    try {
      const trimmed = focusAspects.trim();
      if (!autoGenerate && trimmed.length > 0) {
        await setFocusAspects(articleId, trimmed);
      }

      const quiz = await generateQuiz(articleId);
      setResult(quiz);
      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate quiz');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = () => {
    setResult(null);
    setError(null);
    setStep('input');
  };

  const handleSave = async () => {
    if (!articleId || !result) return;

    setIsSaving(true);
    setError(null);

    try {
      await saveQuizAsFallback(articleId, result.quizId);
      setStep('saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save quiz');
    } finally {
      setIsSaving(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/60 backdrop-blur-sm opacity-0 pointer-events-none"
    >
      <div
        ref={modalRef}
        data-cy="generate-quiz-modal"
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-brand-border px-6 py-4">
          <h2 className="text-lg font-bold text-brand-text-primary font-display">
            {step === 'review' ? 'Review Quiz' : 'Generate Quiz'}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={isGenerating || isSaving}
            className="rounded p-1 text-brand-text-secondary hover:bg-brand-hover hover:text-brand-text-primary transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {step === 'input' && (
            <>
              <label
                htmlFor="quiz-focus-aspects"
                className="mb-2 block text-sm font-semibold text-brand-text-primary"
              >
                Focus aspects (optional)
              </label>
              <p className="mb-3 text-xs text-brand-text-secondary">
                Tell the quiz generator what to emphasize, e.g. &quot;prioritize
                the branching workflow section&quot;.
              </p>
              <textarea
                id="quiz-focus-aspects"
                data-cy="quiz-focus-aspects-input"
                value={focusAspects}
                onChange={(e) => setFocusAspectsValue(e.target.value)}
                disabled={isLoadingAspects || isGenerating}
                maxLength={MAX_FOCUS_ASPECTS_LENGTH}
                rows={4}
                placeholder="e.g. Focus on the security considerations covered in this article."
                className="w-full resize-none rounded-lg border border-brand-border px-3 py-2 text-sm text-brand-text-primary focus:border-brand-red focus:outline-none disabled:opacity-50"
              />
              <div className="mt-1 text-right text-xs text-brand-text-secondary">
                {focusAspects.length}/{MAX_FOCUS_ASPECTS_LENGTH}
              </div>

              {error && (
                <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-brand-red">
                  {error}
                </div>
              )}
            </>
          )}

          {step === 'review' && result && (
            <div className="flex flex-col gap-6">
              <p className="text-xs text-brand-text-secondary">
                Review the generated questions below. Save this set as the
                article&apos;s fallback quiz, or regenerate with different
                focus aspects.
              </p>
              {result.questions.map((question, index) => (
                <QuizQuestionCard
                  key={question.id}
                  question={question}
                  label={`Question ${index + 1} of ${result.questions.length}`}
                />
              ))}

              {error && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-brand-red">
                  {error}
                </div>
              )}
            </div>
          )}

          {step === 'saved' && (
            <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
              Quiz saved as the article&apos;s fallback quiz.
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-brand-border bg-gray-50 px-6 py-4">
          {step === 'input' && (
            <>
              <button
                type="button"
                onClick={handleClose}
                disabled={isGenerating}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-brand-border hover:text-brand-text-primary transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                data-cy="generate-quiz-submit-button"
                onClick={handleGenerate}
                disabled={isGenerating || isLoadingAspects || !articleId}
                className="flex items-center gap-2 rounded-lg bg-brand-red px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-brand-red-hover disabled:bg-brand-red-disabled transition-colors"
              >
                {isGenerating ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Generating...
                  </>
                ) : (
                  'Generate'
                )}
              </button>
            </>
          )}

          {step === 'review' && (
            <>
              <button
                type="button"
                data-cy="regenerate-quiz-button"
                onClick={handleRegenerate}
                disabled={isSaving}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-brand-border hover:text-brand-text-primary transition-colors disabled:opacity-50"
              >
                Regenerate
              </button>
              <button
                type="button"
                data-cy="save-quiz-button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 rounded-lg bg-brand-red px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-brand-red-hover disabled:bg-brand-red-disabled transition-colors"
              >
                {isSaving ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Saving...
                  </>
                ) : (
                  'Save'
                )}
              </button>
            </>
          )}

          {step === 'saved' && (
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg bg-brand-red px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-brand-red-hover transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
