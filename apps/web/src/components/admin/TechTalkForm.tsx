'use client';

import { useState } from 'react';
import {
    createTechTalk,
    updateTechTalk,
    publishTechTalk,
    type CreateTechTalkData,
    type UpdateTechTalkData,
    type TechTalkDetail,
} from '@/lib/api/techTalks';
import { Toast } from '@/components/shared/Toast';
import { useToast } from '@/lib/hooks/useToast';
import { ConfirmationModal } from '@/components/shared/ConfirmationModal';

interface TechTalkFormProps {
    initialData?: TechTalkDetail;
}

function toDateTimeLocalValue(isoDate?: string): string {
    if (!isoDate) {
        return '';
    }

    const date = new Date(isoDate);
    const timezoneOffset = date.getTimezoneOffset() * 60 * 1000;

    return new Date(date.getTime() - timezoneOffset)
        .toISOString()
        .slice(0, 16);
}

export function TechTalkForm({
    initialData,
}: TechTalkFormProps): React.JSX.Element {
    const [title, setTitle] = useState(initialData?.title ?? '');

    const [description, setDescription] = useState(
        initialData?.description ?? ''
    );

    const [presenters, setPresenters] = useState<string[]>(
        initialData?.presenters ?? []
    );

    const [tags, setTags] = useState<string[]>(
        initialData?.tags ?? []
    );

    const [eventDate, setEventDate] = useState(
        toDateTimeLocalValue(initialData?.eventDate)
    );

    const [youtubeVideoId, setYoutubeVideoId] = useState(
        initialData?.youtubeVideoId ?? ''
    );

    const [slidesFile, setSlidesFile] = useState<File | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);
    const { toast, showToast } = useToast();
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);

    const isEditMode = Boolean(initialData);

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
            if (isEditMode && initialData) {
                const data: UpdateTechTalkData = {
                    title: title.trim(),
                    description: description.trim(),
                    presenters,
                    tags,
                    eventDate: new Date(eventDate).toISOString(),
                    youtubeVideoId: youtubeVideoId.trim() || undefined,
                };

                await updateTechTalk(
                    initialData.id,
                    data,
                    slidesFile ?? undefined
                );

                showToast('Tech Talk updated as draft successfully', 'success');
            } else {
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
            }
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
            if (isEditMode && initialData) {
                const data: UpdateTechTalkData = {
                    title: title.trim(),
                    description: description.trim(),
                    presenters,
                    tags,
                    eventDate: new Date(eventDate).toISOString(),
                    youtubeVideoId: youtubeVideoId.trim() || undefined,
                };

                await updateTechTalk(
                    initialData.id,
                    data,
                    slidesFile ?? undefined
                );

                await publishTechTalk(initialData.id);

                showToast('Tech Talk updated and published successfully', 'success');
            } else {
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

                showToast('Tech Talk published successfully', 'success');
            }

            setIsConfirmModalOpen(false);
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
            <div className="bg-brand-surface border border-brand-border rounded shadow-sm p-6">
                {validationError && (
                    <div className="mb-6 p-4 bg-brand-red/10 border border-brand-red/20 rounded text-brand-red text-sm">
                        {validationError}
                    </div>
                )}

                <form className="space-y-6">
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-brand-text-primary mb-2">Title</label>
                        <input
                            id="title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded text-brand-text-primary focus:outline-none focus:border-brand-red transition-colors text-sm"
                            placeholder="Enter Tech Talk title"
                        />
                    </div>

                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-brand-text-primary mb-2">Description</label>
                        <textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={4}
                            className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded text-brand-text-primary focus:outline-none focus:border-brand-red transition-colors text-sm resize-y"
                            placeholder="Enter description"
                        />
                    </div>

                    <div>
                        <label htmlFor="presenters" className="block text-sm font-medium text-brand-text-primary mb-2">Presenters</label>
                        {presenters.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2">
                                {presenters.map((presenter) => (
                                    <span key={presenter} className="inline-flex items-center px-2.5 py-1 bg-brand-bg border border-brand-border rounded text-sm text-brand-text-secondary">
                                        {presenter}
                                        <button
                                            type="button"
                                            onClick={() => removePresenter(presenter)}
                                            className="ml-1.5 text-brand-text-secondary hover:text-brand-red focus:outline-none"
                                            aria-label={`Remove ${presenter}`}
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                        <input
                            id="presenters"
                            type="text"
                            placeholder="Type and press Enter to add presenter..."
                            className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded text-brand-text-primary focus:outline-none focus:border-brand-red transition-colors text-sm"
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
                        <label htmlFor="tags" className="block text-sm font-medium text-brand-text-primary mb-2">Tags</label>
                        {tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2">
                                {tags.map((tag) => (
                                    <span key={tag} className="inline-flex items-center px-2.5 py-1 bg-brand-bg border border-brand-border rounded text-sm text-brand-text-secondary">
                                        {tag}
                                        <button
                                            type="button"
                                            onClick={() => removeTag(tag)}
                                            className="ml-1.5 text-brand-text-secondary hover:text-brand-red focus:outline-none"
                                            aria-label={`Remove ${tag}`}
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                        <input
                            id="tags"
                            type="text"
                            placeholder="Type and press Enter to add tag..."
                            className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded text-brand-text-primary focus:outline-none focus:border-brand-red transition-colors text-sm"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.currentTarget.value.trim() !== '') {
                                    e.preventDefault();
                                    addTag(e.currentTarget.value.trim());
                                    e.currentTarget.value = '';
                                }
                            }}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="eventDate" className="block text-sm font-medium text-brand-text-primary mb-2">Event Date</label>
                            <input
                                id="eventDate"
                                type="datetime-local"
                                value={eventDate}
                                onChange={(e) => setEventDate(e.target.value)}
                                className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded text-brand-text-primary focus:outline-none focus:border-brand-red transition-colors text-sm"
                            />
                        </div>

                        <div>
                            <label htmlFor="youtubeVideoId" className="block text-sm font-medium text-brand-text-primary mb-2">YouTube Video ID</label>
                            <input
                                id="youtubeVideoId"
                                type="text"
                                value={youtubeVideoId}
                                onChange={(e) => setYoutubeVideoId(e.target.value)}
                                placeholder="Enter 11-character ID"
                                className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded text-brand-text-primary focus:outline-none focus:border-brand-red transition-colors text-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="slides" className="block text-sm font-medium text-brand-text-primary mb-2">Slides (PDF, PPT, PPTX)</label>
                        <input
                            id="slides"
                            type="file"
                            accept=".pdf,.ppt,.pptx"
                            onChange={(e) => {
                                const file = e.target.files?.[0] ?? null;
                                setSlidesFile(file);
                            }}
                            className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded text-brand-text-secondary focus:outline-none focus:border-brand-red transition-colors text-sm file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-brand-red/10 file:text-brand-red hover:file:bg-brand-red/20 cursor-pointer"
                        />
                    </div>

                    <div className="pt-6 border-t border-brand-border flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={handleSaveDraft}
                            disabled={isSaving || isPublishing}
                            className="w-full sm:w-auto px-4 py-2 border border-brand-border text-brand-text-primary bg-brand-surface hover:bg-brand-hover rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        >
                            {isSaving ? 'Saving...' : 'Save Draft'}
                        </button>

                        <button
                            type="button"
                            onClick={handleOpenPublishModal}
                            disabled={isSaving || isPublishing}
                            className="w-full sm:w-auto px-5 py-2 bg-brand-red hover:bg-brand-red-hover text-white rounded text-sm font-bold shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Save & Publish
                        </button>
                    </div>
                </form>
            </div>

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