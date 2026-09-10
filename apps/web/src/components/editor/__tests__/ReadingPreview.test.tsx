import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReadingPreview } from '../ReadingPreview';
import { useEditorDraft } from '@/components/editor/EditorDraftContext';
import { useUser } from '@/lib/hooks/useUser';

const mockSaveDraft = jest.fn();
const mockSubmitForReview = jest.fn();
const mockApiFetch = jest.fn();
const currentBody = { type: 'doc', content: [{ type: 'paragraph' }] };

jest.mock('gsap', () => ({ fromTo: jest.fn() }));
jest.mock('@/components/editor/EditorDraftContext', () => ({ useEditorDraft: jest.fn() }));
jest.mock('@/lib/hooks/useUser', () => ({ useUser: jest.fn() }));
jest.mock('@/lib/api/client', () => ({ apiFetch: (...args: unknown[]) => mockApiFetch(...args) }));
jest.mock('@/components/UserAvatar', () => ({ UserAvatar: ({ name, avatarUrl }: { name?: string; avatarUrl?: string | null }) => React.createElement('div', { 'data-testid': 'user-avatar', 'data-name': name, 'data-avatar-url': avatarUrl ?? '' }) }));
jest.mock('@/components/article-detail/ArticleContent', () => ({ ArticleContent: ({ body }: { body: unknown }) => React.createElement('div', { 'data-testid': 'article-content', 'data-body': JSON.stringify(body) }) }));

const mockUseEditorDraft = useEditorDraft as jest.MockedFunction<typeof useEditorDraft>;
const mockUseUser = useUser as jest.MockedFunction<typeof useUser>;

function setDraft(overrides: Record<string, unknown> = {}): void {
  mockUseEditorDraft.mockReturnValue({ title: 'Current title', tags: ['React', 'TypeScript'], currentBody, featuredImageUrl: 'https://example.com/cover.png', saveDraft: mockSaveDraft, submitForReview: mockSubmitForReview, ...overrides } as unknown as ReturnType<typeof useEditorDraft>);
}

describe('ReadingPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setDraft();
    mockUseUser.mockReturnValue({ user: { id: 'user-1', name: 'Current Author', email: 'author@example.com', avatarUrl: 'https://example.com/avatar.png', role: 'User', isActive: true, createdAt: '2026-01-01' }, loading: false, error: null, refetch: jest.fn() });
  });

  it('renders live draft data without triggering writes', () => {
    render(React.createElement(ReadingPreview));
    expect(screen.getByText('Current title')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Article cover' })).toHaveAttribute('src', 'https://example.com/cover.png');
    expect(screen.getByTestId('user-avatar')).toHaveAttribute('data-name', 'Current Author');
    expect(screen.getByTestId('user-avatar')).toHaveAttribute('data-avatar-url', 'https://example.com/avatar.png');
    expect(screen.getByTestId('article-content')).toHaveAttribute('data-body', JSON.stringify(currentBody));
    expect(mockSaveDraft).not.toHaveBeenCalled();
    expect(mockSubmitForReview).not.toHaveBeenCalled();
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it('handles empty values and an unavailable user without a fake cover', () => {
    setDraft({ title: '', tags: [], currentBody: { type: 'doc', content: [] }, featuredImageUrl: null });
    mockUseUser.mockReturnValue({ user: null, loading: true, error: null, refetch: jest.fn() });
    render(React.createElement(ReadingPreview));
    expect(screen.getByText('Untitled Draft')).toBeInTheDocument();
    expect(screen.getByText('Unknown Author')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Article cover' })).not.toBeInTheDocument();
  });

  it('keeps desktop, tablet, and mobile viewport controls', async () => {
    render(React.createElement(ReadingPreview));
    const article = screen.getByRole('article');
    expect(article).toHaveClass('max-w-4xl');
    await userEvent.click(screen.getByRole('button', { name: /tablet/i }));
    expect(article).toHaveClass('max-w-2xl');
    await userEvent.click(screen.getByRole('button', { name: /mobile/i }));
    expect(article).toHaveClass('max-w-sm');
    await userEvent.click(screen.getByRole('button', { name: /desktop/i }));
    expect(article).toHaveClass('max-w-4xl');
  });
});
