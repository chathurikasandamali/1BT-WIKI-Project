'use client';

import React, { useRef, useState, useEffect } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { cn } from '@/lib/utils';
import { CheckCircleIcon } from '@/components/shared/icons/CheckCircleIcon';
import { BanIcon } from '@/components/shared/icons/BanIcon';

gsap.registerPlugin(useGSAP);

export interface BanModalProps {
  userName: string;
  isBanned: boolean;
  onConfirm: (banReason?: string) => Promise<void>;
  onCancel: () => void;
}

export function BanModal({
  userName,
  isBanned,
  onConfirm,
  onCancel,
}: BanModalProps): React.JSX.Element {
  const overlayRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [banReason, setBanReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Entrance animation
  useGSAP(() => {
    if (overlayRef.current) {
      gsap.fromTo(
        overlayRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.2, ease: 'power2.out' }
      );
    }
    if (cardRef.current) {
      gsap.fromTo(
        cardRef.current,
        { scale: 0.92, opacity: 0, y: 12 },
        { scale: 1, opacity: 1, y: 0, duration: 0.25, ease: 'back.out(1.4)' }
      );
    }
  });

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  const handleConfirm = async () => {
    if (!isBanned && banReason.trim().length === 0) {
      setError('Ban reason is required.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onConfirm(isBanned ? undefined : banReason.trim());
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
      data-testid="ban-modal-overlay"
      onClick={(e) => {
        if (e.target === overlayRef.current) onCancel();
      }}
    >
      <div
        ref={cardRef}
        className="bg-brand-surface border border-brand-border rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden"
        data-testid="ban-modal"
      >
        {/* Header */}
        <div
          className={cn(
            'px-6 py-4 border-b border-brand-border flex items-center gap-3',
            isBanned ? 'bg-green-50' : 'bg-brand-red/5'
          )}
        >
          <div
            className={cn(
              'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0',
              isBanned ? 'bg-green-100' : 'bg-brand-red/10'
            )}
          >
            {isBanned ? (
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
            ) : (
              <BanIcon className="w-5 h-5 text-brand-red" />
            )}
          </div>
          <div>
            <h2 className="text-sm font-semibold text-brand-text-primary">
              {isBanned ? 'Reactivate User' : 'Deactivate User'}
            </h2>
            <p className="text-xs text-brand-text-secondary mt-0.5 truncate max-w-[280px]">
              {userName}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p className="text-sm text-brand-text-secondary mb-4">
            {isBanned
              ? "This will restore the user's access to the platform. They will be able to log in immediately."
              : 'This will prevent the user from logging in. Please provide a reason for the record.'}
          </p>

          {!isBanned && (
            <div>
              <label
                htmlFor="ban-reason-input"
                className="block text-sm font-medium text-brand-text-primary mb-2"
              >
                Ban Reason <span className="text-brand-red">*</span>
              </label>
              <textarea
                id="ban-reason-input"
                data-testid="ban-reason-input"
                rows={3}
                value={banReason}
                onChange={(e) => {
                  setBanReason(e.target.value);
                  setError(null);
                }}
                placeholder="e.g. Violation of community guidelines"
                className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded text-sm text-brand-text-primary placeholder:text-brand-text-secondary/60 focus:outline-none focus:border-brand-red transition-colors resize-none"
              />
              {error && (
                <p
                  className="mt-1.5 text-xs text-brand-red"
                  data-testid="ban-reason-error"
                >
                  {error}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-brand-border flex justify-end gap-3 bg-brand-bg/40">
          <button
            type="button"
            onClick={onCancel}
            data-testid="ban-modal-cancel"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-brand-text-secondary border border-brand-border rounded hover:bg-brand-bg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            data-testid="ban-modal-confirm"
            disabled={isSubmitting}
            className={cn(
              'px-4 py-2 text-sm font-medium text-white rounded transition-colors disabled:opacity-50',
              isBanned
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-brand-red hover:bg-brand-red-hover'
            )}
          >
            {isSubmitting
              ? isBanned
                ? 'Reactivating...'
                : 'Deactivating...'
              : isBanned
                ? 'Reactivate'
                : 'Deactivate'}
          </button>
        </div>
      </div>
    </div>
  );
}
