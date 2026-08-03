'use client';

import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isConfirming?: boolean;
}

export function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isConfirming = false,
}: ConfirmationModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!mounted) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/60 backdrop-blur-sm opacity-0 pointer-events-none"
    >
      <div
        ref={modalRef}
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-brand-border px-6 py-4">
          <h2 className="text-lg font-bold text-brand-text-primary font-display">
            {title}
          </h2>
          <button
            onClick={onCancel}
            disabled={isConfirming}
            className="rounded p-1 text-brand-text-secondary hover:bg-brand-hover hover:text-brand-text-primary transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-6 text-sm text-gray-600">{message}</div>

        <div className="flex items-center justify-end gap-3 border-t border-brand-border bg-gray-50 px-6 py-4">
          <button
            onClick={onCancel}
            disabled={isConfirming}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-brand-border hover:text-brand-text-primary transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isConfirming}
            className="flex items-center gap-2 rounded-lg bg-brand-red px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-brand-red-hover disabled:bg-brand-red-disabled transition-colors"
          >
            {isConfirming ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Processing...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
