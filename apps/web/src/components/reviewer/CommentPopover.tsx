'use client';

import React, { useState, useEffect, useRef } from 'react';

interface CommentPopoverProps {
  isOpen: boolean;
  selectedText: string;
  coords: { top: number; left: number; positionBelow?: boolean } | null;
  onSubmit: (comment: string) => void;
  onCancel: () => void;
}

export function CommentPopover({
  isOpen,
  selectedText,
  coords,
  onSubmit,
  onCancel,
}: CommentPopoverProps) {
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setComment('');
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onCancel();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen, onCancel]);

  if (!isOpen || !coords) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = comment.trim();
    if (!trimmed) {
      setError('Comment cannot be empty');
      return;
    }
    setError(null);
    onSubmit(trimmed);
  };

  // Truncate selected text for preview
  const truncatedText =
    selectedText.length > 80
      ? `${selectedText.substring(0, 80)}...`
      : selectedText;

  return (
    <div
      ref={popoverRef}
      style={{
        position: 'absolute',
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        transform: coords.positionBelow ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
        marginTop: coords.positionBelow ? '8px' : '-8px',
      }}
      data-testid="comment-popover"
      className="z-50 w-80 rounded-lg border border-brand-border bg-white p-4 shadow-xl animate-fade-in"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-text-secondary">
            Selected Text
          </span>
          <p className="mt-1 bg-brand-bg px-2 py-1.5 rounded text-xs text-brand-text-primary italic border border-brand-border line-clamp-2">
            &quot;{truncatedText}&quot;
          </p>
        </div>

        <div>
          <label htmlFor="popover-comment-input" className="text-[10px] font-bold uppercase tracking-wider text-brand-text-secondary block mb-1">
            Feedback Comment
          </label>
          <textarea
            id="popover-comment-input"
            rows={3}
            value={comment}
            onChange={(e) => {
              setComment(e.target.value);
              if (error) setError(null);
            }}
            placeholder="What needs correcting?..."
            data-testid="comment-textarea"
            className="w-full rounded border border-brand-border p-2 text-sm text-brand-text-primary focus:border-brand-red focus:outline-none focus:ring-1 focus:ring-brand-red"
          />
          {error && (
            <p data-testid="comment-error" className="mt-1 text-xs text-brand-red font-medium">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 text-xs font-semibold">
          <button
            type="button"
            data-testid="cancel-comment-button"
            onClick={onCancel}
            className="px-3 py-1.5 text-gray-500 hover:bg-brand-hover rounded transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            data-testid="submit-comment-button"
            className="px-3 py-1.5 bg-brand-red text-white hover:bg-brand-red-hover rounded transition-colors"
          >
            Add Feedback
          </button>
        </div>
      </form>
    </div>
  );
}
