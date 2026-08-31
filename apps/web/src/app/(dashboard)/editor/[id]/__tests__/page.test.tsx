import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import EditArticlePage from '../page';
import * as clientApi from '@/lib/api/client';
import { DraftManagerSidebar } from '@/components/editor/DraftManagerSidebar';

// Mock the API client
jest.mock('@/lib/api/client', () => ({
  apiFetch: jest.fn(),
}));

// Mock Next.js navigation hooks
let mockId = 'article-a-uuid';
const mockRouterPush = jest.fn();
const mockRouter = { push: mockRouterPush };
jest.mock('next/navigation', () => ({
  useParams: () => ({ id: mockId }),
  useRouter: () => mockRouter,
}));

// Mock GSAP and Lenis hooks to prevent errors in test env
jest.mock('@gsap/react', () => ({
  useGSAP: jest.fn((cb) => cb()),
}));
jest.mock('gsap', () => ({
  to: jest.fn(),
  fromTo: jest.fn(),
  killTweensOf: jest.fn(),
  set: jest.fn(),
}));
jest.mock('@/lib/hooks/useLenisScroll', () => ({
  useLenisScroll: jest.fn(),
}));

// Mock ImageEmbedModal to prevent context errors
jest.mock('@/components/editor/ImageEmbedModal', () => ({
  ImageEmbedModal: () => <div data-testid="image-modal" />
}));

// Mock the TipTap editor to avoid complex DOM mounting in JSDOM,
// but simulate enough behavior to test autosave and content updates
jest.mock('@tiptap/react', () => {
  const actual = jest.requireActual('@tiptap/react');
  return {
    ...actual,
    useEditor: ({ content }: { content: unknown }) => {
      // Simulate an editor instance
      return {
        state: { doc: { textContent: 'mock text' } },
        commands: { setContent: jest.fn() },
        getJSON: () => content,
        destroy: jest.fn(),
        isActive: jest.fn().mockReturnValue(false),
        can: jest.fn().mockReturnValue({
          undo: jest.fn().mockReturnValue(true),
          redo: jest.fn().mockReturnValue(true),
        }),
        chain: jest.fn().mockReturnValue({
          focus: jest.fn().mockReturnValue({
            toggleBold: jest.fn().mockReturnValue({ run: jest.fn() }),
            toggleItalic: jest.fn().mockReturnValue({ run: jest.fn() }),
            toggleStrike: jest.fn().mockReturnValue({ run: jest.fn() }),
            toggleCode: jest.fn().mockReturnValue({ run: jest.fn() }),
            toggleHeading: jest.fn().mockReturnValue({ run: jest.fn() }),
            toggleBulletList: jest.fn().mockReturnValue({ run: jest.fn() }),
            toggleOrderedList: jest.fn().mockReturnValue({ run: jest.fn() }),
            toggleBlockquote: jest.fn().mockReturnValue({ run: jest.fn() }),
            undo: jest.fn().mockReturnValue({ run: jest.fn() }),
            redo: jest.fn().mockReturnValue({ run: jest.fn() }),
          })
        })
      };
    },
    EditorContent: () => <div data-testid="tiptap-editor" />,
  };
});

// We need to mock Next/Image and lucide-react if needed, but they usually work.

describe('Edit Article Page', () => {
  const mockArticleA = {
    id: 'article-a-uuid',
    title: 'Article A Title',
    body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Article A Body' }] }] },
    tags: ['#Testing'],
    status: 'Draft',
    authorId: 'user-1',
  };

  const mockArticleB = {
    id: 'article-b-uuid',
    title: 'Article B Title',
    body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Article B Body' }] }] },
    tags: ['#Testing'],
    status: 'Draft',
    authorId: 'user-1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockId = 'article-a-uuid';
    (clientApi.apiFetch as jest.Mock).mockImplementation(async (url: string) => {
      if (url.includes('article-a-uuid')) return { data: mockArticleA };
      if (url.includes('article-b-uuid')) return { data: mockArticleB };
      throw new Error('Not found');
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('Existing article loading', async () => {
    render(<EditArticlePage />);

    expect(screen.queryByDisplayValue('Article A Title')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByDisplayValue('Article A Title')).toBeInTheDocument();
    });
  });

  test('Route parameter change resets state and remounts provider', async () => {
    const { rerender } = render(<EditArticlePage />);
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('Article A Title')).toBeInTheDocument();
    });

    mockId = 'article-b-uuid';
    rerender(<EditArticlePage />);
    
    expect(screen.queryByDisplayValue('Article A Title')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByDisplayValue('Article B Title')).toBeInTheDocument();
    });
  });

  test('Autosave isolation between route changes', async () => {
    const { rerender } = render(<EditArticlePage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Article A Title')).toBeInTheDocument();
    });

    // Enable fake timers just for testing the autosave debounce
    jest.useFakeTimers();

    // Make a change in Article A (triggering autosave timer)
    const titleInput = screen.getByDisplayValue('Article A Title');
    fireEvent.change(titleInput, { target: { value: 'Article A Changed' } });

    // Navigate to Article B BEFORE the debounce expires
    mockId = 'article-b-uuid';
    rerender(<EditArticlePage />);

    // Advance fake timers to trigger any scheduled autosave
    act(() => {
      jest.advanceTimersByTime(3500);
    });

    // Verify NO patch request was sent for Article A after navigating away
    const patchCalls = (clientApi.apiFetch as jest.Mock).mock.calls.filter(call => call[1]?.method === 'PATCH');
    expect(patchCalls.length).toBe(0);
    jest.useRealTimers();
  });

  test('Fetch failure after route change', async () => {
    const { rerender } = render(<EditArticlePage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Article A Title')).toBeInTheDocument();
    });

    mockId = 'article-b-uuid';
    (clientApi.apiFetch as jest.Mock).mockImplementationOnce(async () => { throw new Error('Article not available'); });
    rerender(<EditArticlePage />);

    expect(screen.getByText('Loading article...')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/my-articles');
    }, { timeout: 4000 });

    expect(screen.queryByDisplayValue('Article A Title')).not.toBeInTheDocument();
  }, 10000);

  test('Sidebar placeholders are absent', () => {
    render(
      <DraftManagerSidebar isOpen={true} toggleSidebar={jest.fn()} />
    );

    expect(screen.queryByText('Crafting Interfaces')).not.toBeInTheDocument();
    expect(screen.queryByText('State Management in 2026')).not.toBeInTheDocument();
    expect(screen.queryByText('malinduyasanjith2001')).not.toBeInTheDocument();
    expect(screen.queryByText('My Stories (2)')).not.toBeInTheDocument();
    
    // Instead, it should show the empty state message or loading state
    expect(screen.getByText('Loading drafts...')).toBeInTheDocument();
  });
});
