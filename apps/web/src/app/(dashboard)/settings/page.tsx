'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useUser, type UserMeData } from '@/lib/hooks/useUser';
import { apiFetch } from '@/lib/api/client';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

import { ProfileIcon } from '@/components/shared/icons/ProfileIcon';
import { LockIcon } from '@/components/shared/icons/LockIcon';
import { BellIcon } from '@/components/shared/icons/BellIcon';
import { CameraIcon } from '@/components/shared/icons/CameraIcon';

export default function ProfileSettingsPage() {
  const { user, loading, refetch } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [showPhotoInput, setShowPhotoInput] = useState(false);
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const cameraBadgeRef = useRef<HTMLButtonElement>(null);
  const photoButtonsRef = useRef<HTMLDivElement>(null);
  const urlInputRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);

  // Initialize form when user data loads
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setAvatarUrl(user.avatarUrl || '');
    }
  }, [user]);

  // GSAP: Initial mount animation
  useGSAP(
    () => {
      if (cardRef.current) {
        gsap.from(cardRef.current, {
          y: 12,
          opacity: 0,
          duration: 0.4,
          ease: 'power2.out',
        });
      }
    },
    { scope: containerRef }
  );

  // GSAP: Edit Mode transitions
  useGSAP(
    () => {
      if (isEditing) {
        gsap.to(cameraBadgeRef.current, {
          scale: 1,
          opacity: 1,
          duration: 0.3,
          ease: 'back.out(1.5)',
        });
        gsap.to(photoButtonsRef.current, {
          width: 'auto',
          opacity: 1,
          duration: 0.3,
          ease: 'power2.out',
        });
        gsap.to(footerRef.current, {
          height: 'auto',
          opacity: 1,
          marginTop: '24px',
          duration: 0.3,
          ease: 'power2.out',
        });
      } else {
        gsap.to(cameraBadgeRef.current, {
          scale: 0,
          opacity: 0,
          duration: 0.2,
        });
        gsap.to(photoButtonsRef.current, {
          width: 0,
          opacity: 0,
          duration: 0.2,
        });
        gsap.to(footerRef.current, {
          height: 0,
          opacity: 0,
          marginTop: 0,
          duration: 0.2,
        });
        setShowPhotoInput(false);
      }
    },
    { scope: containerRef, dependencies: [isEditing] }
  );

  // GSAP: Photo Input URL reveal transition
  useGSAP(
    () => {
      if (showPhotoInput && isEditing) {
        gsap.to(urlInputRef.current, {
          height: 'auto',
          opacity: 1,
          marginTop: '16px',
          duration: 0.3,
          ease: 'power2.out',
        });
      } else {
        gsap.to(urlInputRef.current, {
          height: 0,
          opacity: 0,
          marginTop: 0,
          duration: 0.3,
          ease: 'power2.out',
        });
      }
    },
    { scope: containerRef, dependencies: [showPhotoInput, isEditing] }
  );

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center h-full">
        <div className="text-brand-text-secondary">Loading profile...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 text-brand-red">Failed to load user profile.</div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg('Name cannot be empty.');
      return;
    }

    // Basic URL validation
    if (avatarUrl) {
      try {
        new URL(avatarUrl);
      } catch {
        setErrorMsg('Please enter a valid URL for the profile photo.');
        return;
      }
    }

    setIsSaving(true);
    try {
      const result = await apiFetch<UserMeData>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({
          name: trimmedName,
          avatarUrl: avatarUrl || null,
        }),
      });

      if (result.success) {
        setIsEditing(false);
        await refetch(); // Update sidebar/navbar

        // Success pulse animation
        if (cardRef.current) {
          gsap.fromTo(
            cardRef.current,
            {
              borderColor: '#CC0000',
              boxShadow: '0 0 0 2px rgba(204,0,0,0.1)',
            },
            {
              borderColor: 'var(--color-brand-border)',
              boxShadow: 'var(--shadow-sm)',
              duration: 0.6,
              ease: 'power2.out',
            }
          );
        }
      } else {
        setErrorMsg(result.error || 'Failed to update profile.');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto" ref={containerRef}>
      <h1 className="text-2xl font-semibold text-brand-text-primary mb-8">
        Account Settings
      </h1>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Tabs */}
        <div className="w-full md:w-56 flex-shrink-0 space-y-1">
          <div
            className="flex items-center gap-3 px-3 py-2.5 bg-brand-red/10 text-brand-red font-medium rounded-r border-l-4 border-brand-red"
            data-testid="tab-profile"
          >
            <ProfileIcon className="w-5 h-5" />
            <span>Profile Settings</span>
          </div>
          <div
            className="flex items-center justify-between gap-3 px-3 py-2.5 text-brand-text-secondary opacity-50 cursor-not-allowed rounded border-l-4 border-transparent"
            data-testid="tab-password-disabled"
          >
            <div className="flex items-center gap-3">
              <LockIcon className="w-5 h-5" />
              <span>Password</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-brand-bg px-1.5 py-0.5 rounded">
              Soon
            </span>
          </div>
          <div
            className="flex items-center justify-between gap-3 px-3 py-2.5 text-brand-text-secondary opacity-50 cursor-not-allowed rounded border-l-4 border-transparent"
            data-testid="tab-notifications-disabled"
          >
            <div className="flex items-center gap-3">
              <BellIcon className="w-5 h-5" />
              <span>Notifications</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-brand-bg px-1.5 py-0.5 rounded">
              Soon
            </span>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="flex-1">
          <div
            ref={cardRef}
            className="bg-brand-surface border border-brand-border rounded shadow-sm"
          >
            <div className="p-6 border-b border-brand-border flex justify-between items-center">
              <h2 className="text-lg font-medium text-brand-text-primary">
                Profile Details
              </h2>
              <button
                data-testid="edit-toggle-btn"
                onClick={() => {
                  setIsEditing(!isEditing);
                  if (isEditing) {
                    // Reset if canceling
                    setName(user.name || '');
                    setAvatarUrl(user.avatarUrl || '');
                    setErrorMsg(null);
                  }
                }}
                className="text-sm font-medium text-brand-red hover:text-brand-red-hover px-2 py-1 -mr-2 rounded transition-colors"
              >
                {isEditing ? 'Cancel' : 'Edit'}
              </button>
            </div>

            <div className="p-6">
              {errorMsg && (
                <div
                  className="mb-6 p-4 bg-brand-red/10 border border-brand-red/20 rounded text-brand-red text-sm"
                  data-testid="error-message"
                >
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleSave}>
                {/* Avatar Section */}
                <div className="mb-8">
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      {avatarUrl || user.avatarUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={isEditing ? avatarUrl : user.avatarUrl || ''}
                          alt="Avatar"
                          className="w-24 h-24 rounded-full object-cover border-2 border-brand-border bg-brand-bg"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="%239CA3AF"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>';
                          }}
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-brand-bg flex items-center justify-center border-2 border-brand-border text-brand-text-secondary text-3xl font-medium">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                      )}

                      <button
                        ref={cameraBadgeRef}
                        type="button"
                        onClick={() => setShowPhotoInput(!showPhotoInput)}
                        className="absolute bottom-0 right-0 w-8 h-8 bg-brand-red rounded-full flex items-center justify-center text-white border-2 border-brand-surface shadow-sm hover:bg-brand-red-hover opacity-0 scale-0 origin-center"
                        aria-label="Toggle photo input"
                      >
                        <CameraIcon className="w-4 h-4" />
                      </button>
                    </div>

                    <div
                      ref={photoButtonsRef}
                      className="overflow-hidden w-0 opacity-0 whitespace-nowrap"
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setShowPhotoInput(!showPhotoInput)}
                          data-testid="change-photo-btn"
                          className="px-4 py-2 bg-brand-red/10 text-brand-red text-sm rounded font-medium hover:bg-brand-red/20 transition-colors"
                        >
                          Change Photo
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAvatarUrl('');
                            setShowPhotoInput(false);
                          }}
                          data-testid="remove-photo-btn"
                          className="px-4 py-2 border border-brand-border text-brand-text-secondary text-sm rounded font-medium hover:bg-brand-bg transition-colors"
                        >
                          Remove Photo
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* URL Input Reveal */}
                  <div
                    ref={urlInputRef}
                    className="overflow-hidden h-0 opacity-0"
                  >
                    <label className="block text-sm font-medium text-brand-text-primary mb-2">
                      Direct Image URL
                    </label>
                    <input
                      type="text"
                      data-testid="photo-url-input"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://example.com/photo.jpg"
                      className="w-full max-w-md px-3 py-2 bg-brand-bg border border-brand-border rounded text-brand-text-primary focus:outline-none focus:border-brand-red transition-colors text-sm"
                    />
                    <p className="mt-1 text-xs text-brand-text-secondary">
                      Paste a link to publicly hosted image.
                    </p>
                  </div>
                </div>

                {/* Form Fields 2-col */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-brand-text-primary mb-2">
                      Full Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        data-testid="name-input"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded text-brand-text-primary focus:outline-none focus:border-brand-red transition-colors text-sm"
                      />
                    ) : (
                      <div className="px-3 py-2 text-sm text-brand-text-primary border border-transparent">
                        {user.name}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-brand-text-primary mb-2">
                      Email Address
                    </label>
                    <div className="w-full px-3 py-2 bg-brand-bg/50 border border-brand-border rounded text-brand-text-secondary text-sm cursor-not-allowed select-none">
                      {user.email}
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-brand-text-primary mb-2">
                    Account Role
                  </label>
                  <div className="px-3 py-2 border border-transparent">
                    <span className="inline-flex items-center px-2.5 py-1 bg-brand-bg border border-brand-border rounded text-xs font-medium text-brand-text-secondary tracking-wide uppercase">
                      {user.role}
                    </span>
                  </div>
                </div>

                {/* Save Footer */}
                <div ref={footerRef} className="overflow-hidden h-0 opacity-0">
                  <div className="pt-4 border-t border-brand-border flex justify-end">
                    <button
                      type="submit"
                      disabled={isSaving}
                      data-testid="save-btn"
                      className="px-6 py-2 bg-brand-red hover:bg-brand-red-hover text-white rounded text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
