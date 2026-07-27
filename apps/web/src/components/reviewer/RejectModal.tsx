'use client';

import React, { useState, useEffect } from 'react';
import { ConfirmationModal } from '@/components/shared/ConfirmationModal';

export interface RejectModalProps {
  isOpen: boolean;
  articleId: string;
  articleTitle: string;
  onConfirm: (feedback: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function RejectModal({
  isOpen,
  articleTitle,
  onConfirm,
  onCancel,
  isLoading = false,
}: RejectModalProps): React.JSX.Element {
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFeedback('');
      setError(null);
    }
  }, [isOpen]);

  const handleConfirm = () => {
    const trimmed = feedback.trim();
    if (trimmed.length < 10) {
      setError('Rejection feedback must be at least 10 characters');
      return;
    }
    setError(null);
    onConfirm(trimmed);
  };

  const hasError = Boolean(error);

  const messageContent = (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-brand-text-secondary">
        Please provide a reason for rejecting &quot;{articleTitle}&quot;. The author will see this feedback.
      </p>
      <textarea
        value={feedback}
        onChange={(e) => {
          setFeedback(e.target.value);
          if (error && e.target.value.trim().length >= 10) {
            setError(null);
          }
        }}
        placeholder="Reason for rejection (at least 10 characters)..."
        rows={4}
        data-testid="reject-feedback-input"
        className="w-full p-2.5 bg-brand-bg border border-brand-border rounded text-sm text-brand-text-primary focus:outline-none focus:border-brand-red transition-colors resize-none"
      />
      {hasError ? (
        <p className="text-xs text-brand-red font-medium" data-testid="reject-feedback-error">
          {error}
        </p>
      ) : null}
      <p className="text-xs text-brand-text-secondary text-right">
        {feedback.trim().length}/10 min characters
      </p>
    </div>
  );

  return (
    <ConfirmationModal
      isOpen={isOpen}
      title="Reject Article"
      message={messageContent as unknown as string}
      confirmText="Reject Article"
      cancelText="Cancel"
      onConfirm={handleConfirm}
      onCancel={onCancel}
      isConfirming={isLoading}
    />
  );
}
