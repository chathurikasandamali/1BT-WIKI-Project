'use client';

import React, { useState, useEffect } from 'react';
import { ConfirmationModal } from '@/components/shared/ConfirmationModal';

export interface RejectCommentModalProps {
  isOpen: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function RejectCommentModal({
  isOpen,
  onConfirm,
  onCancel,
  isLoading = false,
}: RejectCommentModalProps): React.JSX.Element {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setError(null);
    }
  }, [isOpen]);

  const handleConfirm = () => {
    const trimmed = reason.trim();
    if (trimmed.length < 10) {
      setError('Rejection reason must be at least 10 characters');
      return;
    }
    setError(null);
    onConfirm(trimmed);
  };

  const hasError = Boolean(error);

  const messageContent = (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-brand-text-secondary">
        Please provide a reason for rejecting this comment. The author will see this feedback.
      </p>
      <textarea
        value={reason}
        onChange={(e) => {
          setReason(e.target.value);
          if (error && e.target.value.trim().length >= 10) {
            setError(null);
          }
        }}
        placeholder="Reason for rejection (at least 10 characters)..."
        rows={4}
        data-testid="reject-comment-reason-input"
        className="w-full p-2.5 bg-brand-bg border border-brand-border rounded text-sm text-brand-text-primary focus:outline-none focus:border-brand-red transition-colors resize-none"
      />
      {hasError ? (
        <p className="text-xs text-brand-red font-medium" data-testid="reject-comment-reason-error">
          {error}
        </p>
      ) : null}
      <p className="text-xs text-brand-text-secondary text-right">
        {reason.trim().length}/10 min characters
      </p>
    </div>
  );

  return (
    <ConfirmationModal
      isOpen={isOpen}
      title="Reject Comment"
      message={messageContent as unknown as string}
      confirmText="Reject Comment"
      cancelText="Cancel"
      onConfirm={handleConfirm}
      onCancel={onCancel}
      isConfirming={isLoading}
    />
  );
}
