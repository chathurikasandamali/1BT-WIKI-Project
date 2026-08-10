'use client';

import { useState } from 'react';
import {
    createTechTalk,
    type CreateTechTalkData,
} from '@/lib/api/techTalks';
import { Toast } from '@/components/shared/Toast';
import { useToast } from '@/lib/hooks/useToast';
import { ConfirmationModal } from '@/components/shared/ConfirmationModal';

export function TechTalkForm(): React.JSX.Element {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [presenters, setPresenters] = useState<string[]>([]);
    const [tags, setTags] = useState<string[]>([]);
    const [eventDate, setEventDate] = useState('');
    const [youtubeVideoId, setYoutubeVideoId] = useState('');
    const [slidesFile, setSlidesFile] = useState<File | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);
    const { toast, showToast } = useToast();
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);

    //add presenters for this tech talk ( one tech talk have multiple presenters )
    const addPresenter = (presenter: string) => {
        if (!presenters.includes(presenter)) {
            setPresenters([...presenters, presenter]);
        }
    };

    const removePresenter = (presenterToRemove: string) => {
        setPresenters(
            presenters.filter((presenter) => presenter !== presenterToRemove)
        );
    };

    const addTag = (tag: string) => {
        if (!tags.includes(tag)) {
            setTags([...tags, tag]);
        }
    };

    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter((tag) => tag !== tagToRemove));
    };

    const validateForm = (): string | null => {
        if (!title.trim()) {
            return 'Title is required';
        }

        if (presenters.length === 0) {
            return 'At least one presenter is required';
        }

        if (!eventDate) {
            return 'Event date is required';
        }

        if (youtubeVideoId.trim() && !/^[a-zA-Z0-9_-]{11}$/.test(youtubeVideoId.trim())) {
            return 'Enter a valid 11-character YouTube Video ID';
        }

        return null;
    };

    const handleSaveDraft = async () => {
        const error = validateForm();

        if (error) {
            setValidationError(error);
            return;
        }

        setValidationError(null);
        setIsSaving(true);

        try {
            const data: CreateTechTalkData = {
                title: title.trim(),
                description: description.trim() || undefined,
                presenters,
                tags,
                eventDate: new Date(eventDate).toISOString(),
                youtubeVideoId: youtubeVideoId.trim() || undefined,
                publishImmediately: false,
            };

            await createTechTalk(data, slidesFile ?? undefined);

            showToast('Tech Talk saved as draft successfully', 'success');
        } catch (error) {
            showToast(
                error instanceof Error ? error.message : 'Failed to save Tech Talk',
                'error'
            );
        } finally {
            setIsSaving(false);
        }
    };

    const handleOpenPublishModal = () => {
        const error = validateForm();

        if (error) {
            setValidationError(error);
            return;
        }

        setValidationError(null);
        setIsConfirmModalOpen(true);
    };

    const handleSaveAndPublish = async () => {
        setIsPublishing(true);

        try {
            const data: CreateTechTalkData = {
                title: title.trim(),
                description: description.trim() || undefined,
                presenters,
                tags,
                eventDate: new Date(eventDate).toISOString(),
                youtubeVideoId: youtubeVideoId.trim() || undefined,
                publishImmediately: true,
            };

            await createTechTalk(data, slidesFile ?? undefined);

            setIsConfirmModalOpen(false);

            showToast('Tech Talk published successfully', 'success');
        } catch (error) {
            setIsConfirmModalOpen(false);

            showToast(
                error instanceof Error ? error.message : 'Failed to publish Tech Talk',
                'error'
            );
        } finally {
            setIsPublishing(false);
        }
    };

    return (
        <>
            <form>
                <div>
                    <label htmlFor="title">Title</label>

                    <input
                        id="title"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>

                <div>
                    <label htmlFor="description">Description</label>

                    <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>

                <div>
                    <label htmlFor="presenters">Presenters</label>

                    <div>
                        {presenters.map((presenter) => (
                            <span key={presenter}>
                                {presenter}

                                <button
                                    type="button"
                                    onClick={() => removePresenter(presenter)}
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                    </div>

                    <input
                        id="presenters"
                        type="text"
                        placeholder="Add presenter..."
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.currentTarget.value.trim() !== '') {
                                e.preventDefault();

                                addPresenter(e.currentTarget.value.trim());

                                e.currentTarget.value = '';
                            }
                        }}
                    />
                </div>

                <div>
                    <label htmlFor="tags">Tags</label>

                    <div>
                        {tags.map((tag) => (
                            <span key={tag}>
                                {tag}

                                <button
                                    type="button"
                                    onClick={() => removeTag(tag)}
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                    </div>

                    <input
                        id="tags"
                        type="text"
                        placeholder="Add tag..."
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.currentTarget.value.trim() !== '') {
                                e.preventDefault();

                                addTag(e.currentTarget.value.trim());

                                e.currentTarget.value = '';
                            }
                        }}
                    />
                </div>

                <div>
                    <label htmlFor="eventDate">Event Date</label>

                    <input
                        id="eventDate"
                        type="datetime-local"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                    />
                </div>

                <div>
                    <label htmlFor="youtubeVideoId">YouTube Video ID</label>

                    <input
                        id="youtubeVideoId"
                        type="text"
                        value={youtubeVideoId}
                        onChange={(e) => setYoutubeVideoId(e.target.value)}
                        placeholder="Enter YouTube video ID"
                    />
                </div>

                <div>
                    <label htmlFor="slides">Slides</label>

                    <input
                        id="slides"
                        type="file"
                        accept=".pdf,.ppt,.pptx"
                        onChange={(e) => {
                            const file = e.target.files?.[0] ?? null;
                            setSlidesFile(file);
                        }}
                    />
                </div>

                {validationError && (
                    <p>{validationError}</p>
                )}

                <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={isSaving || isPublishing}
                >
                    {isSaving ? 'Saving...' : 'Save Draft'}
                </button>

                <button
                    type="button"
                    onClick={handleOpenPublishModal}
                    disabled={isSaving || isPublishing}
                >
                    Save & Publish
                </button>
            </form>

            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                title="Publish Tech Talk"
                message="Are you sure you want to save and publish this Tech Talk?"
                confirmText="Publish"
                onConfirm={handleSaveAndPublish}
                onCancel={() => setIsConfirmModalOpen(false)}
                isConfirming={isPublishing}
            />

            <Toast
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
            />

        </>




    );
}