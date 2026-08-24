import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import type { Editor } from '@tiptap/react';

const mockApiFetch = jest.fn();

jest.mock('@/lib/api/client', () => ({
    apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

import {
    EditorDraftProvider,
    useEditorDraft,
    type ArticleAttachment,
} from '../EditorDraftContext';

function wrapper({ children }: { children: ReactNode }) {
    return <EditorDraftProvider>{children}</EditorDraftProvider>;
}

const defaultInitialArticle = {
    id: 'article-123',
    title: 'My Existing Article',
    body: {
        type: 'doc',
        content: [],
    },
    status: 'Draft',
    authorId: 'user-123',
    coverAttachmentId: 'cover-123',
    coverImageUrl: 'https://example.com/cover.png',
    tags: ['React', 'TypeScript'],
    createdAt: '2026-08-12T10:00:00.000Z',
    updatedAt: '2026-08-12T10:00:00.000Z',
    attachments: [],
};

function wrapperWithArticle({ children }: { children: ReactNode }) {
    return (
        <EditorDraftProvider initialArticle={defaultInitialArticle}>
            {children}
        </EditorDraftProvider>
    );
}

describe('EditorDraftContext', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('Initialization & basic state', () => {
        it('starts with the default state when no initial article is provided', () => {
            const { result } = renderHook(() => useEditorDraft(), {
                wrapper,
            });

            expect(result.current.articleId).toBeNull();
            expect(result.current.articleStatus).toBeNull();
            expect(result.current.title).toBe('');
            expect(result.current.tags).toEqual([]);
            expect(result.current.saveStatus).toBe('idle');
            expect(result.current.lastSavedAt).toBeNull();
            expect(result.current.lastError).toBeNull();
            expect(result.current.featuredImageUrl).toBeNull();
            expect(result.current.attachments).toEqual([]);
            expect(result.current.wordCount).toBe(0);
            expect(result.current.charCount).toBe(0);
            expect(result.current.initialBody).toBeNull();
            expect(result.current.initialStatus).toBeNull();
        });

        it('initializes state from the provided article', () => {
            const { result } = renderHook(() => useEditorDraft(), {
                wrapper: wrapperWithArticle,
            });

            expect(result.current.articleId).toBe('article-123');
            expect(result.current.articleStatus).toBe('Draft');
            expect(result.current.title).toBe('My Existing Article');
            expect(result.current.tags).toEqual(['React', 'TypeScript']);
            expect(result.current.coverAttachmentId).toBe('cover-123');
            expect(result.current.featuredImageUrl).toBe('https://example.com/cover.png');
            expect(result.current.attachments).toEqual([]);
            expect(result.current.initialBody).toEqual({
                type: 'doc',
                content: [],
            });
            expect(result.current.initialStatus).toBe('Draft');

            expect(result.current.saveStatus).toBe('idle');
            expect(result.current.lastSavedAt).toBeNull();
            expect(result.current.lastError).toBeNull();
        });

        it('throws an error when useEditorDraft is used outside Provider', () => {
            // Suppress console.error for this specific expected throw
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            expect(() => renderHook(() => useEditorDraft())).toThrow(
                'useEditorDraft must be used within an EditorDraftProvider'
            );
            consoleErrorSpy.mockRestore();
        });
    });

    describe('State helpers', () => {
        it('setTitle updates the title', () => {
            const { result } = renderHook(() => useEditorDraft(), { wrapper });
            act(() => {
                result.current.setTitle('New Title');
            });
            expect(result.current.title).toBe('New Title');
        });

        it('setTags updates tags', () => {
            const { result } = renderHook(() => useEditorDraft(), { wrapper });
            act(() => {
                result.current.setTags(['Tag1', 'Tag2']);
            });
            expect(result.current.tags).toEqual(['Tag1', 'Tag2']);
        });

        it('notifyContentChanged updates word and character counts', () => {
            const { result } = renderHook(() => useEditorDraft(), { wrapper });
            act(() => {
                result.current.notifyContentChanged(10, 50);
            });
            expect(result.current.wordCount).toBe(10);
            expect(result.current.charCount).toBe(50);
        });
    });

    describe('ensureDraftExists', () => {
        it('creates a new draft when ensureDraftExists is called', async () => {
            mockApiFetch.mockResolvedValueOnce({
                success: true,
                data: {
                    id: 'new-article-123',
                    title: 'Untitled Draft',
                    body: {},
                    status: 'Draft',
                    authorId: 'user-123',
                    tags: [],
                    createdAt: '2026-08-12T10:00:00.000Z',
                    updatedAt: '2026-08-12T10:00:00.000Z',
                    attachments: [],
                },
            });

            const { result } = renderHook(() => useEditorDraft(), { wrapper });

            let createdId: string | undefined;

            await act(async () => {
                createdId = await result.current.ensureDraftExists();
            });

            expect(createdId).toBe('new-article-123');
            expect(mockApiFetch).toHaveBeenCalledTimes(1);
            expect(mockApiFetch).toHaveBeenCalledWith(
                '/articles',
                expect.objectContaining({
                    method: 'POST',
                    body: expect.any(FormData),
                })
            );

            expect(result.current.articleId).toBe('new-article-123');
            expect(result.current.articleStatus).toBe('Draft');
            expect(result.current.title).toBe('Untitled Draft');
            expect(result.current.saveStatus).toBe('saved');
            expect(result.current.lastSavedAt).toBeInstanceOf(Date);
            expect(result.current.lastError).toBeNull();
            expect(result.current.attachments).toEqual([]);
        });

        it('does not create another draft if an article ID already exists', async () => {
            const { result } = renderHook(() => useEditorDraft(), { wrapper: wrapperWithArticle });

            let createdId: string | undefined;
            await act(async () => {
                createdId = await result.current.ensureDraftExists();
            });

            expect(createdId).toBe('article-123');
            expect(mockApiFetch).not.toHaveBeenCalled();
        });

        it('two concurrent calls share the same creation request and create only one article', async () => {
            // Setup a delayed response to ensure concurrency
            mockApiFetch.mockImplementationOnce(() => new Promise((resolve) => setTimeout(() => resolve({
                success: true,
                data: {
                    id: 'concurrent-123',
                    title: 'Concurrent Draft',
                    body: {},
                    status: 'Draft',
                    tags: [],
                    attachments: [],
                },
            }), 50)));

            const { result } = renderHook(() => useEditorDraft(), { wrapper });

            let id1: string, id2: string;

            await act(async () => {
                const p1 = result.current.ensureDraftExists();
                const p2 = result.current.ensureDraftExists();
                [id1, id2] = await Promise.all([p1, p2]);
            });

            expect(id1!).toBe('concurrent-123');
            expect(id2!).toBe('concurrent-123');
            expect(mockApiFetch).toHaveBeenCalledTimes(1); // Only 1 POST request
        });

        it('uses the entered title when a title exists', async () => {
            mockApiFetch.mockResolvedValueOnce({
                success: true,
                data: { id: 'new-1', status: 'Draft', attachments: [] },
            });

            const { result } = renderHook(() => useEditorDraft(), { wrapper });

            act(() => {
                result.current.setTitle('My Custom Title');
            });

            await act(async () => {
                await result.current.ensureDraftExists();
            });

            const callArg = mockApiFetch.mock.calls[0][1].body as FormData;
            const dataStr = callArg.get('data') as string;
            expect(JSON.parse(dataStr).title).toBe('My Custom Title');
        });

        it('sets saveStatus to error and stores lastError when creation fails', async () => {
            mockApiFetch.mockRejectedValueOnce(new Error('Network failure'));

            const { result } = renderHook(() => useEditorDraft(), { wrapper });

            await act(async () => {
                await expect(result.current.ensureDraftExists()).rejects.toThrow('Network failure');
            });

            expect(result.current.saveStatus).toBe('error');
            expect(result.current.lastError).toBe('Network failure');
        });
    });

    describe('saveDraft', () => {
        it('successfully PATCHes an existing draft', async () => {
            mockApiFetch.mockResolvedValueOnce({
                success: true,
                data: { status: 'Draft', attachments: [] },
            });

            const { result } = renderHook(() => useEditorDraft(), { wrapper: wrapperWithArticle });

            await act(async () => {
                await result.current.saveDraft();
            });

            expect(mockApiFetch).toHaveBeenCalledWith('/articles/article-123', expect.objectContaining({
                method: 'PATCH',
            }));
            expect(result.current.saveStatus).toBe('saved');
            expect(result.current.lastSavedAt).toBeInstanceOf(Date);
            expect(result.current.lastError).toBeNull();
        });

        it('creates a draft first when one does not exist', async () => {
            mockApiFetch
                .mockResolvedValueOnce({ // POST
                    success: true,
                    data: { id: 'created-draft-1', status: 'Draft', attachments: [] },
                })
                .mockResolvedValueOnce({ // PATCH
                    success: true,
                    data: { status: 'Draft', attachments: [] },
                });

            const { result } = renderHook(() => useEditorDraft(), { wrapper });

            await act(async () => {
                await result.current.saveDraft();
            });

            expect(mockApiFetch).toHaveBeenCalledTimes(2);
            expect(mockApiFetch.mock.calls[0][0]).toBe('/articles'); // POST
            expect(mockApiFetch.mock.calls[1][0]).toBe('/articles/created-draft-1'); // PATCH
        });

        it('correctly merges returned attachments without duplicates', async () => {
            const initialArticleWithAttachment = {
                ...defaultInitialArticle,
                attachments: [{ id: 'att-1' } as unknown as ArticleAttachment]
            };
            mockApiFetch.mockResolvedValueOnce({
                success: true,
                data: {
                    status: 'Draft',
                    attachments: [{ id: 'att-1' }, { id: 'att-2' }] // att-2 is new
                },
            });

            const { result } = renderHook(() => useEditorDraft(), {
                wrapper: ({ children }) => <EditorDraftProvider initialArticle={initialArticleWithAttachment}>{children}</EditorDraftProvider>
            });

            await act(async () => {
                await result.current.saveDraft();
            });

            expect(result.current.attachments.length).toBe(2);
            expect(result.current.attachments[0]?.id).toBe('att-1');
            expect(result.current.attachments[1]?.id).toBe('att-2');
        });

        it('handles API failure correctly on saveDraft', async () => {
            mockApiFetch.mockRejectedValueOnce(new Error('Save failed'));

            const { result } = renderHook(() => useEditorDraft(), { wrapper: wrapperWithArticle });

            await act(async () => {
                await expect(result.current.saveDraft()).rejects.toThrow('Save failed');
            });

            expect(result.current.saveStatus).toBe('error');
            expect(result.current.lastError).toBe('Save failed');
        });
    });

    describe('uploadImage', () => {
        it('uploads using the correct article endpoint and identifies the newly returned attachment', async () => {
            mockApiFetch.mockResolvedValueOnce({
                success: true,
                data: {
                    status: 'Draft',
                    attachments: [
                        { id: 'new-image-1', fileUrl: 'https://img.com/1.png' }
                    ]
                },
            });

            const { result } = renderHook(() => useEditorDraft(), { wrapper: wrapperWithArticle });
            const mockFile = new File([''], 'test.png', { type: 'image/png' });

            let fileUrl: string | undefined;
            await act(async () => {
                fileUrl = await result.current.uploadImage(mockFile);
            });

            expect(fileUrl).toBe('https://img.com/1.png');
            expect(mockApiFetch).toHaveBeenCalledWith('/articles/article-123', expect.objectContaining({
                method: 'PATCH',
                body: expect.any(FormData)
            }));
            const formData = mockApiFetch.mock.calls[0][1].body as FormData;
            expect(formData.get('images')).toBe(mockFile);
            
            expect(result.current.attachments.length).toBe(1);
            expect(result.current.attachments[0]?.id).toBe('new-image-1');
        });

        it('creates draft first if required', async () => {
            mockApiFetch
                .mockResolvedValueOnce({ // POST ensureDraftExists
                    success: true,
                    data: { id: 'draft-for-image', status: 'Draft', attachments: [] },
                })
                .mockResolvedValueOnce({ // PATCH upload
                    success: true,
                    data: {
                        status: 'Draft',
                        attachments: [{ id: 'new-image-2', fileUrl: 'https://img.com/2.png' }]
                    },
                });

            const { result } = renderHook(() => useEditorDraft(), { wrapper });
            const mockFile = new File([''], 'test2.png', { type: 'image/png' });

            let fileUrl: string | undefined;
            await act(async () => {
                fileUrl = await result.current.uploadImage(mockFile);
            });

            expect(fileUrl).toBe('https://img.com/2.png');
            expect(mockApiFetch).toHaveBeenCalledTimes(2);
            expect(mockApiFetch.mock.calls[0][0]).toBe('/articles');
            expect(mockApiFetch.mock.calls[1][0]).toBe('/articles/draft-for-image');
        });

        it('throws if image upload succeeded but no new attachment was returned', async () => {
            mockApiFetch.mockResolvedValueOnce({
                success: true,
                data: {
                    status: 'Draft',
                    attachments: [] // No new attachment
                },
            });

            const { result } = renderHook(() => useEditorDraft(), { wrapper: wrapperWithArticle });
            const mockFile = new File([''], 'test.png', { type: 'image/png' });

            await act(async () => {
                await expect(result.current.uploadImage(mockFile)).rejects.toThrow(
                    'Image upload succeeded but no new attachment was returned'
                );
            });
            
            expect(result.current.saveStatus).toBe('error');
        });

        it('warns if multiple new attachments are returned and returns the last one', async () => {
            mockApiFetch.mockResolvedValueOnce({
                success: true,
                data: {
                    status: 'Draft',
                    attachments: [
                        { id: 'att-x', fileUrl: 'x.png' },
                        { id: 'att-y', fileUrl: 'y.png' },
                    ]
                },
            });

            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

            const { result } = renderHook(() => useEditorDraft(), { wrapper: wrapperWithArticle });
            const mockFile = new File([''], 'test.png', { type: 'image/png' });

            let fileUrl: string | undefined;
            await act(async () => {
                fileUrl = await result.current.uploadImage(mockFile);
            });

            expect(fileUrl).toBe('y.png');
            expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Unexpected: 2 new attachments'));

            consoleWarnSpy.mockRestore();
        });
        
        it('handles API failure correctly on uploadImage', async () => {
            mockApiFetch.mockRejectedValueOnce(new Error('Upload failed'));

            const { result } = renderHook(() => useEditorDraft(), { wrapper: wrapperWithArticle });
            const mockFile = new File([''], 'test.png', { type: 'image/png' });

            await act(async () => {
                await expect(result.current.uploadImage(mockFile)).rejects.toThrow('Upload failed');
            });

            expect(result.current.saveStatus).toBe('error');
            expect(result.current.lastError).toBe('Upload failed');
        });
    });

    describe('Editor integration', () => {
        it('registerEditor allows later operations to use the editor (insertEditorImage)', () => {
            const mockRun = jest.fn();
            const mockSetImage = jest.fn().mockReturnValue({ run: mockRun });
            const mockFocus = jest.fn().mockReturnValue({ setImage: mockSetImage });
            const mockChain = jest.fn().mockReturnValue({ focus: mockFocus });
            const mockEditor = {
                chain: mockChain,
                getJSON: () => ({ type: 'doc', content: [] }),
            } as unknown as Editor;

            const { result } = renderHook(() => useEditorDraft(), { wrapper });

            act(() => {
                result.current.registerEditor(mockEditor);
            });

            act(() => {
                result.current.insertEditorImage('https://img.com/test.png');
            });

            expect(mockChain).toHaveBeenCalled();
            expect(mockFocus).toHaveBeenCalled();
            expect(mockSetImage).toHaveBeenCalledWith({ src: 'https://img.com/test.png' });
            expect(mockRun).toHaveBeenCalled();
        });

        it('insertEditorImage without a registered editor does not crash', () => {
            const { result } = renderHook(() => useEditorDraft(), { wrapper });
            expect(() => {
                act(() => {
                    result.current.insertEditorImage('https://img.com/test.png');
                });
            }).not.toThrow();
        });
        
        it('uses editor getJSON in requests', async () => {
            const mockEditor = {
                getJSON: () => ({ type: 'doc', content: [{ type: 'paragraph' }] }),
            } as unknown as Editor;
            
            mockApiFetch.mockResolvedValueOnce({
                success: true,
                data: { status: 'Draft', attachments: [] },
            });

            const { result } = renderHook(() => useEditorDraft(), { wrapper: wrapperWithArticle });

            act(() => {
                result.current.registerEditor(mockEditor);
            });
            
            await act(async () => {
                await result.current.saveDraft();
            });
            
            const formData = mockApiFetch.mock.calls[0][1].body as FormData;
            const dataStr = formData.get('data') as string;
            expect(JSON.parse(dataStr).body).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] });
        });
    });

    describe('submitForReview', () => {
        it('sends the expected submit request and updates status', async () => {
            mockApiFetch.mockResolvedValueOnce({
                success: true,
                data: { status: 'Pending Review' },
            });

            const { result } = renderHook(() => useEditorDraft(), { wrapper: wrapperWithArticle });

            await act(async () => {
                await result.current.submitForReview();
            });

            expect(mockApiFetch).toHaveBeenCalledWith('/articles/article-123/submit', expect.objectContaining({
                method: 'POST',
            }));
            expect(result.current.articleStatus).toBe('Pending Review');
            expect(result.current.saveStatus).toBe('saved');
        });

        it('ensures draft exists first if no articleId', async () => {
            mockApiFetch
                .mockResolvedValueOnce({ // POST ensureDraftExists
                    success: true,
                    data: { id: 'draft-to-submit', status: 'Draft', attachments: [] },
                })
                .mockResolvedValueOnce({ // POST submit
                    success: true,
                    data: { status: 'Pending Review' },
                });

            const { result } = renderHook(() => useEditorDraft(), { wrapper });

            await act(async () => {
                await result.current.submitForReview();
            });

            expect(mockApiFetch).toHaveBeenCalledTimes(2);
            expect(mockApiFetch.mock.calls[0][0]).toBe('/articles');
            expect(mockApiFetch.mock.calls[1][0]).toBe('/articles/draft-to-submit/submit');
            expect(result.current.articleStatus).toBe('Pending Review');
        });
        
        it('handles API failure correctly on submitForReview', async () => {
            mockApiFetch.mockRejectedValueOnce(new Error('Submit failed'));

            const { result } = renderHook(() => useEditorDraft(), { wrapper: wrapperWithArticle });

            await act(async () => {
                await expect(result.current.submitForReview()).rejects.toThrow('Submit failed');
            });

            expect(result.current.saveStatus).toBe('error');
            expect(result.current.lastError).toBe('Submit failed');
        });
    });

    describe('Autosave', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('does not autosave when no article ID exists', () => {
            const { result } = renderHook(() => useEditorDraft(), { wrapper });

            act(() => {
                result.current.notifyContentChanged(10, 50);
            });

            jest.advanceTimersByTime(3500);

            expect(mockApiFetch).not.toHaveBeenCalled();
        });

        it('autosaves after the configured 3-second delay when an article ID exists', async () => {
            mockApiFetch.mockResolvedValue({
                success: true,
                data: { status: 'Draft', attachments: [] },
            });

            const { result } = renderHook(() => useEditorDraft(), { wrapper: wrapperWithArticle });

            act(() => {
                result.current.notifyContentChanged(10, 50);
            });

            expect(mockApiFetch).not.toHaveBeenCalled();

            await act(async () => {
                jest.advanceTimersByTime(3000);
            });

            expect(mockApiFetch).toHaveBeenCalledTimes(1);
            expect(mockApiFetch).toHaveBeenCalledWith('/articles/article-123', expect.objectContaining({
                method: 'PATCH',
            }));
        });

        it('debounces multiple rapid content changes', async () => {
            mockApiFetch.mockResolvedValue({
                success: true,
                data: { status: 'Draft', attachments: [] },
            });

            const { result } = renderHook(() => useEditorDraft(), { wrapper: wrapperWithArticle });

            act(() => {
                result.current.notifyContentChanged(1, 10);
            });
            
            jest.advanceTimersByTime(1000);
            
            act(() => {
                result.current.notifyContentChanged(2, 20);
            });

            jest.advanceTimersByTime(1000);
            
            act(() => {
                result.current.notifyContentChanged(3, 30);
            });
            
            // Still no call because the timer keeps resetting
            expect(mockApiFetch).not.toHaveBeenCalled();
            
            // Wait full 3 seconds from the last change
            await act(async () => {
                jest.advanceTimersByTime(3000);
            });

            expect(mockApiFetch).toHaveBeenCalledTimes(1);
        });
        
        it('clears timer on unmount', () => {
            const { result, unmount } = renderHook(() => useEditorDraft(), { wrapper: wrapperWithArticle });

            act(() => {
                result.current.notifyContentChanged(10, 50);
            });
            
            unmount();
            
            jest.advanceTimersByTime(3500);
            
            expect(mockApiFetch).not.toHaveBeenCalled();
        });
    });

    describe('Request locking / concurrency', () => {
        it('serializes overlapping requests', async () => {
            // Delay responses to force overlap
            let resolveFirst: (v: unknown) => void;
            const promiseFirst = new Promise(r => { resolveFirst = r; });
            
            mockApiFetch
                .mockImplementationOnce(() => promiseFirst)
                .mockResolvedValueOnce({
                    success: true,
                    data: { status: 'Draft', attachments: [] },
                });

            const { result } = renderHook(() => useEditorDraft(), { wrapper: wrapperWithArticle });

            let savePromise1: Promise<void>;
            let savePromise2: Promise<void>;

            act(() => {
                savePromise1 = result.current.saveDraft(); // Blocked on promiseFirst
                savePromise2 = result.current.submitForReview(); // Should queue up behind savePromise1
            });
            
            expect(mockApiFetch).toHaveBeenCalledTimes(1); // Second one is waiting on the lock
            
            await act(async () => {
                resolveFirst!({
                    success: true,
                    data: { status: 'Draft', attachments: [] },
                });
                await savePromise1;
                await savePromise2;
            });
            
            expect(mockApiFetch).toHaveBeenCalledTimes(2);
            // Submit should happen after save resolves
            expect(mockApiFetch.mock.calls[1][0]).toBe('/articles/article-123/submit');
        });
    });
    
    describe('handleTitleBlur', () => {
        it('calls ensureDraftExists when title is not empty and no articleId exists', async () => {
            mockApiFetch.mockResolvedValueOnce({
                success: true,
                data: {
                    id: 'new-draft-from-blur',
                    status: 'Draft',
                    attachments: [],
                },
            });

            const { result } = renderHook(() => useEditorDraft(), { wrapper });
            
            act(() => {
                result.current.setTitle('My Awesome Post');
            });
            
            await act(async () => {
                result.current.handleTitleBlur();
            });
            
            expect(mockApiFetch).toHaveBeenCalledWith('/articles', expect.objectContaining({ method: 'POST' }));
            expect(result.current.articleId).toBe('new-draft-from-blur');
        });
        
        it('does not call ensureDraftExists when title is empty', async () => {
            const { result } = renderHook(() => useEditorDraft(), { wrapper });
            
            act(() => {
                result.current.setTitle('   ');
            });
            
            await act(async () => {
                result.current.handleTitleBlur();
            });
            
            expect(mockApiFetch).not.toHaveBeenCalled();
        });
        
        it('does not call ensureDraftExists when articleId already exists', async () => {
            const { result } = renderHook(() => useEditorDraft(), { wrapper: wrapperWithArticle });
            
            act(() => {
                result.current.setTitle('New Title');
            });
            
            await act(async () => {
                result.current.handleTitleBlur();
            });
            
            expect(mockApiFetch).not.toHaveBeenCalled();
        });
    });
});
