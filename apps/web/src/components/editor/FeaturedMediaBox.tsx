'use client';

import React, { useState } from 'react';
import { X, Check, Loader2 } from 'lucide-react';
import { useEditorDraft } from '@/components/editor/EditorDraftContext';
import { cn } from '@/lib/utils';
import { PlusIcon } from '@/components/shared/icons/PlusIcon';

export function FeaturedMediaBox() {
  const { uploadImage, featuredImageUrl, setFeaturedImageUrl } =
    useEditorDraft();
  const [displayInFeed, setDisplayInFeed] = useState(true);
  const [pinToTop, setPinToTop] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const Checkbox = ({
    checked,
    onChange,
    label,
  }: {
    checked: boolean;
    onChange: () => void;
    label: string;
  }) => (
    <label className="flex items-center justify-between cursor-pointer group">
      <span className="text-sm font-medium text-brand-text-primary group-hover:text-brand-red transition-colors">
        {label}
      </span>
      <div
        className={cn(
          'w-5 h-5 rounded flex items-center justify-center transition-colors border',
          checked
            ? 'bg-brand-red border-brand-red'
            : 'bg-white border-brand-border group-hover:border-brand-red/50'
        )}
      >
        {checked && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
      </div>
      {/* Hidden native checkbox to handle standard events, though we control it manually */}
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
    </label>
  );

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const fileUrl = await uploadImage(file);
      setFeaturedImageUrl(fileUrl);
      // TODO: Backend persistence needed once Prisma migration + featured-image
      // schema field lands. Currently the backend has no way to persist "this
      // attachment is the featured image" — it's just a regular attachment row.
      // Track which attachment URL is the featured one in FRONTEND state only
      // for now.
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      // Reset the input so the same file can be re-selected
      e.target.value = '';
    }
  };

  const removeImage = (e: React.MouseEvent) => {
    e.preventDefault();
    setFeaturedImageUrl(null);
    setUploadError(null);
  };

  return (
    <div className="rounded-xl border border-brand-border bg-white p-6 shadow-sm mt-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-widest text-brand-text-secondary">
          Featured Media
        </h3>
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
          Header Image
        </span>
      </div>

      {isUploading ? (
        <div className="relative mb-6 flex h-32 w-full items-center justify-center rounded-lg border-2 border-dashed border-brand-red/30 bg-red-50">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 text-brand-red animate-spin" />
            <span className="text-xs font-medium text-brand-red">
              Uploading...
            </span>
          </div>
        </div>
      ) : featuredImageUrl ? (
        <div className="relative mb-6 h-32 w-full overflow-hidden rounded-lg group border border-brand-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={featuredImageUrl}
            alt="Featured"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />

          <button
            onClick={removeImage}
            className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-black/60"
            title="Remove image"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <label className="relative mb-6 flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-brand-border bg-gray-50 transition-colors hover:border-brand-red/50 hover:bg-gray-100 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm mb-2 group-hover:scale-110 transition-transform">
            <PlusIcon className="h-4 w-4 text-brand-text-secondary" />
          </div>
          <span className="text-xs font-medium text-brand-text-secondary">
            Upload Image
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleImageUpload}
            className="sr-only"
          />
        </label>
      )}

      {uploadError && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
          <p className="text-xs text-red-600">{uploadError}</p>
        </div>
      )}

      <div className="mb-4">
        <h4 className="text-xs font-bold uppercase tracking-widest text-brand-text-secondary">
          Distribution Options
        </h4>
      </div>

      <div className="flex flex-col gap-4">
        <Checkbox
          checked={displayInFeed}
          onChange={() => setDisplayInFeed(!displayInFeed)}
          label="Display in main feed"
        />
        <Checkbox
          checked={pinToTop}
          onChange={() => setPinToTop(!pinToTop)}
          label="Pin to top of blog"
        />
      </div>
    </div>
  );
}
