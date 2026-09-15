'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { X, UploadCloud, Link as LinkIcon, Loader2 } from 'lucide-react';
import { useEditorDraft } from '@/components/editor/EditorDraftContext';
import { cn } from '@/lib/utils';

interface ImageEmbedModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GENERIC_UPLOAD_ERROR = 'We couldn’t upload this image. Please try again.';

const ACTIONABLE_IMAGE_UPLOAD_ERRORS = new Set([
  'Maximum 10 images per article',
  'Image size cannot exceed 5MB',
  'Only jpeg, png, webp, and gif images are allowed',
]);

function normalizeImageUploadError(error: unknown): string {
  if (
    error instanceof Error &&
    ACTIONABLE_IMAGE_UPLOAD_ERRORS.has(error.message)
  ) {
    return error.message;
  }

  return GENERIC_UPLOAD_ERROR;
}

export function ImageEmbedModal({ isOpen, onClose }: ImageEmbedModalProps) {
  const { uploadImage, insertEditorImage } = useEditorDraft();
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [webUrl, setWebUrl] = useState('');
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useGSAP(() => {
    if (!mounted || !isOpen || !modalRef.current) return;

    gsap.fromTo(
      modalRef.current,
      { y: 30, opacity: 0, scale: 0.95 },
      { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.2)' }
    );
  }, [isOpen, mounted]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const fileUrl = await uploadImage(file);
      insertEditorImage(fileUrl);
      onClose();
    } catch (error) {
      setUploadError(normalizeImageUploadError(error));
    } finally {
      setIsUploading(false);
      // Reset the input so the same file can be re-selected
      e.target.value = '';
    }
  };

  const handleEmbedUrl = () => {
    const trimmedUrl = webUrl.trim();
    if (!trimmedUrl) return;

    insertEditorImage(trimmedUrl);
    setWebUrl('');
    onClose();
  };

  const TabButton = ({
    id,
    icon: Icon,
    label,
  }: {
    id: 'upload' | 'url';
    icon: React.ElementType;
    label: string;
  }) => (
    <button
      type="button"
      onClick={() => setActiveTab(id)}
      className={cn(
        'flex flex-1 items-center justify-center gap-2 border-b-2 py-4 text-sm font-semibold transition-colors',
        activeTab === id
          ? 'border-brand-red text-brand-red'
          : 'border-transparent text-brand-text-secondary hover:text-brand-text-primary hover:bg-brand-bg'
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );

  if (!mounted) return null;

  return createPortal(
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-hidden={!isOpen}
      className={cn(
        'fixed inset-0 z-[100] flex items-center justify-center bg-brand-dark/60 backdrop-blur-sm',
        isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
      )}
    >
      <div
        ref={modalRef}
        className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-brand-border px-6 py-4">
          <h2 className="text-lg font-bold text-brand-text-primary font-display">
            Embed Image
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-brand-text-secondary hover:bg-brand-hover hover:text-brand-text-primary transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex w-full border-b border-brand-border bg-brand-bg/50 px-2">
          <TabButton id="upload" icon={UploadCloud} label="Upload File" />
          <TabButton id="url" icon={LinkIcon} label="Web URL" />
        </div>

        <div className="p-6">
          {activeTab === 'upload' &&
            (isUploading ? (
              <div className="flex h-64 flex-col items-center justify-center rounded-xl border-2 border-dashed border-brand-red/30 bg-red-50">
                <Loader2 className="mb-4 h-10 w-10 text-brand-red animate-spin" />
                <p className="text-sm font-bold text-brand-red">
                  Uploading image...
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <label className="relative flex h-64 flex-col items-center justify-center rounded-xl border-2 border-dashed border-brand-border bg-brand-bg transition-colors hover:border-brand-red hover:bg-red-50 cursor-pointer">
                  <UploadCloud className="mb-4 h-10 w-10 text-gray-400" />
                  <p className="mb-1 text-sm font-bold text-brand-text-primary">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-brand-text-secondary">
                    PNG, JPG, WebP or GIF (max. 5MB)
                  </p>
                  <input
                    type="file"
                    className="sr-only"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleFileUpload}
                  />
                </label>
                {uploadError && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                    <p className="text-xs text-red-600">{uploadError}</p>
                  </div>
                )}
              </div>
            ))}

          {activeTab === 'url' && (
            <div className="flex h-64 flex-col justify-center gap-4">
              <label className="text-sm font-semibold text-brand-text-primary">
                Image URL
              </label>
              <input
                type="text"
                value={webUrl}
                onChange={(e) => setWebUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full rounded-lg border border-brand-border bg-brand-bg py-3 px-4 text-sm text-brand-text-primary placeholder-gray-400 focus:border-brand-red focus:outline-none focus:ring-1 focus:ring-brand-red transition-all"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleEmbedUrl();
                }}
              />
              <button
                type="button"
                onClick={handleEmbedUrl}
                disabled={!webUrl.trim()}
                className="self-end rounded-lg bg-brand-red px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-brand-red-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Embed Image
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
