'use client';

import React, { useEffect, useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { getReviewFeedback, type ReviewFeedback } from '@/lib/api/articles';

export interface ReviewFeedbackModalProps {
  isOpen: boolean;
  articleId: string | null;
  onClose: () => void;
}

export function ReviewFeedbackModal({
  isOpen,
  articleId,
  onClose,
}: ReviewFeedbackModalProps): React.JSX.Element | null {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<ReviewFeedback | null>(null);

  useEffect(() => {
    if (!isOpen || !articleId) {
      setFeedback(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    async function loadFeedback(): Promise<void> {
      try {
        const data = await getReviewFeedback(articleId as string);
        if (!cancelled) {
          setFeedback(data);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          setError(msg || 'Failed to load review feedback');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadFeedback();

    return () => {
      cancelled = true;
    };
  }, [isOpen, articleId]);

  const shouldRenderModal = isOpen && Boolean(articleId);

  if (!shouldRenderModal) {
    return null;
  }

  const overallText = feedback?.overallFeedback?.trim();
  const hasOverallText = Boolean(overallText);

  const commentsList = feedback?.comments ?? [];
  const commentCount = commentsList.length;
  const hasInlineComments = commentCount > 0;

  return (
    <div
      aria-modal="true"
      role="dialog"
      aria-labelledby="review-feedback-modal-title"
      data-testid="review-feedback-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/60 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-brand-border px-6 py-4">
          <h2
            id="review-feedback-modal-title"
            className="text-lg font-bold text-brand-text-primary"
          >
            Review Feedback
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close review feedback modal"
            data-testid="close-feedback-modal-x"
            className="rounded p-1 text-brand-text-secondary hover:bg-brand-hover hover:text-brand-text-primary transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="px-6 py-4 overflow-y-auto flex-1 text-sm space-y-4">
          {loading ? (
            <div
              className="py-8 text-center text-brand-text-secondary"
              data-testid="review-feedback-loading"
            >
              Loading feedback...
            </div>
          ) : null}

          {error ? (
            <div
              className="p-3 bg-brand-red/10 border border-brand-red/20 rounded text-brand-red flex items-start gap-2"
              data-testid="review-feedback-error"
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          ) : null}

          {!loading && !error && feedback ? (
            <>
              {/* Overall Feedback Section */}
              <div className="space-y-1.5" data-testid="overall-feedback-section">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-text-secondary">
                  Overall Feedback
                </h3>
                <div className="p-3 bg-brand-bg border border-brand-border rounded text-brand-text-primary whitespace-pre-wrap break-words">
                  {hasOverallText ? overallText : 'No overall feedback provided.'}
                </div>
              </div>

              {/* Inline Comments Section */}
              <div className="space-y-2 pt-2" data-testid="inline-comments-section">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-text-secondary">
                  Inline Comments ({commentCount})
                </h3>

                {hasInlineComments ? (
                  <ul className="space-y-2 list-none p-0 m-0">
                    {commentsList.map((item) => {
                      const hasSelectedText = Boolean(item.selectedText && item.selectedText.trim());

                      return (
                        <li
                          key={item.id}
                          className="p-3 bg-brand-bg border border-brand-border rounded space-y-1"
                          data-testid={`inline-comment-item-${item.id}`}
                        >
                          {hasSelectedText ? (
                            <blockquote className="text-xs italic text-brand-text-secondary border-l-2 border-brand-red/40 pl-2 py-0.5 my-1">
                              &ldquo;{item.selectedText}&rdquo;
                            </blockquote>
                          ) : null}
                          <p className="text-brand-text-primary whitespace-pre-wrap break-words">
                            {item.comment}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-xs text-brand-text-secondary italic">
                    No inline comments.
                  </p>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end border-t border-brand-border bg-gray-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            data-testid="close-feedback-modal-button"
            className="rounded-lg bg-brand-red px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-brand-red-hover transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
