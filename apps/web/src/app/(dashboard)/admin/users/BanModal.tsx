'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

/**
 * Confirms activating or deactivating a user account.
 */
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useGSAP(() => {
    if (!mounted || !overlayRef.current || !cardRef.current) {
      return;
    }

    gsap.fromTo(
      overlayRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.2, ease: 'power2.out' }
    );
    gsap.fromTo(
      cardRef.current,
      { scale: 0.96, opacity: 0, y: 16 },
      { scale: 1, opacity: 1, y: 0, duration: 0.28, ease: 'power3.out' }
    );
  }, [mounted]);

  useEffect(() => {
    const handler = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && !isSubmitting) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel, isSubmitting]);

  const handleConfirm = async (): Promise<void> => {
    if (!isBanned && banReason.trim().length === 0) {
      setError('A reason is required to deactivate this account.');
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

  const title = isBanned ? 'Activate account' : 'Deactivate account';
  const confirmLabel = isBanned ? 'Activate' : 'Deactivate';
  const submittingLabel = isBanned ? 'Activating...' : 'Deactivating...';

  if (!mounted) {
    return <></>;
  }

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/60 p-4 backdrop-blur-sm"
      data-testid="ban-modal-overlay"
      onClick={(event) => {
        if (event.target === overlayRef.current && !isSubmitting) {
          onCancel();
        }
      }}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-status-modal-title"
        className="w-full max-w-md overflow-hidden rounded border border-brand-border bg-brand-surface shadow-2xl"
        data-testid="ban-modal"
      >
        <div className="flex items-start gap-3 border-b border-brand-border px-6 py-5">
          <span
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded',
              isBanned
                ? 'bg-green-50 text-green-700'
                : 'bg-brand-red/10 text-brand-red'
            )}
          >
            {isBanned ? (
              <CheckCircleIcon className="h-5 w-5" />
            ) : (
              <BanIcon className="h-5 w-5" />
            )}
          </span>
          <div className="min-w-0">
            <h2
              id="account-status-modal-title"
              className="text-base font-semibold text-brand-text-primary"
            >
              {title}
            </h2>
            <p className="mt-1 text-sm text-brand-text-secondary">
              Confirm this change for{' '}
              <span className="font-medium text-brand-text-primary">
                {userName}
              </span>
              .
            </p>
          </div>
        </div>

        <div className="px-6 py-5">
          <p className="text-sm leading-6 text-brand-text-secondary">
            {isBanned
              ? 'This account will be able to sign in again immediately after you confirm.'
              : 'This account will lose access until an admin activates it again.'}
          </p>

          {!isBanned && (
            <div className="mt-4">
              <label
                htmlFor="ban-reason-input"
                className="mb-2 block text-sm font-medium text-brand-text-primary"
              >
                Reason <span className="text-brand-red">*</span>
              </label>
              <textarea
                id="ban-reason-input"
                data-testid="ban-reason-input"
                rows={3}
                value={banReason}
                onChange={(event) => {
                  setBanReason(event.target.value);
                  setError(null);
                }}
                placeholder="Explain why this account is being deactivated"
                className="w-full resize-none rounded border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text-primary placeholder:text-brand-text-secondary/60 transition-colors focus:border-brand-red focus:outline-none"
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

        <div className="flex justify-end gap-3 border-t border-brand-border bg-brand-bg/40 px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            data-testid="ban-modal-cancel"
            disabled={isSubmitting}
            className="rounded border border-brand-border px-4 py-2 text-sm font-medium text-brand-text-secondary transition-colors hover:bg-brand-hover disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            data-testid="ban-modal-confirm"
            disabled={isSubmitting}
            className={cn(
              'rounded px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50',
              isBanned
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-brand-red hover:bg-brand-red-hover'
            )}
          >
            {isSubmitting ? submittingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
