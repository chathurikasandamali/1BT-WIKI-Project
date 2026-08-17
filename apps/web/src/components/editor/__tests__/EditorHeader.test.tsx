import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mocks
const mockRouterBack = jest.fn();
const mockRouterPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    back: mockRouterBack,
    push: mockRouterPush,
  }),
}));

const mockSaveDraft = jest.fn();
const mockSubmitForReview = jest.fn();
const mockEnsureDraftExists = jest.fn();

jest.mock('@/components/editor/EditorDraftContext', () => ({
  useEditorDraft: () => ({
    articleId: 'article-1',
    articleStatus: 'Draft',
    initialStatus: 'Draft',
    title: 'A test title',
    wordCount: 10,
    saveStatus: 'idle',
    lastSavedAt: null,
    lastError: null,
    saveDraft: mockSaveDraft,
    submitForReview: mockSubmitForReview,
    ensureDraftExists: mockEnsureDraftExists,
  }),
}));

jest.mock('@/components/editor/GenerateQuizModal', () => ({
  GenerateQuizModal: () => null,
}));

jest.mock('@/lib/hooks/useAutoDismissToast', () => ({
  useAutoDismissToast: () => ({
    isVisible: false,
    message: '',
    showToast: jest.fn(),
  }),
  DRAFT_SAVED_MESSAGE: 'Draft saved',
}));

jest.mock('gsap', () => ({
  __esModule: true,
  default: {
    registerPlugin: jest.fn(),
    killTweensOf: jest.fn(),
    to: jest.fn(),
    set: jest.fn(),
  },
}));

jest.mock('@gsap/react', () => ({
  useGSAP: jest.fn((cb) => cb()),
}));

import { EditorHeader } from '../EditorHeader';

describe('EditorHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Back Button', () => {
    it('renders a Back button named "Go back"', () => {
      render(<EditorHeader mode="compose" setMode={jest.fn()} />);
      const backButton = screen.getByRole('button', { name: /go back/i });
      expect(backButton).toBeInTheDocument();
      expect(backButton).toHaveAttribute('type', 'button');
    });

    it('calls router.back when history length > 1', async () => {
      const originalLength = window.history.length;
      Object.defineProperty(window.history, 'length', { value: 2, configurable: true });

      render(<EditorHeader mode="compose" setMode={jest.fn()} />);
      const backButton = screen.getByRole('button', { name: /go back/i });
      
      const user = userEvent.setup();
      await user.click(backButton);
      
      expect(mockRouterBack).toHaveBeenCalled();
      expect(mockRouterPush).not.toHaveBeenCalled();

      Object.defineProperty(window.history, 'length', { value: originalLength, configurable: true });
    });

    it('navigates to /my-articles when history length <= 1', async () => {
      const originalLength = window.history.length;
      Object.defineProperty(window.history, 'length', { value: 1, configurable: true });

      render(<EditorHeader mode="compose" setMode={jest.fn()} />);
      const backButton = screen.getByRole('button', { name: /go back/i });
      
      const user = userEvent.setup();
      await user.click(backButton);
      
      expect(mockRouterBack).not.toHaveBeenCalled();
      expect(mockRouterPush).toHaveBeenCalledWith('/my-articles');

      Object.defineProperty(window.history, 'length', { value: originalLength, configurable: true });
    });
  });

  describe('Logo Link', () => {
    it('renders a logo link pointing to home', () => {
      render(<EditorHeader mode="compose" setMode={jest.fn()} />);
      const logoLink = screen.getByRole('link', { name: /1bt wiki home/i });
      expect(logoLink).toBeInTheDocument();
      expect(logoLink).toHaveAttribute('href', '/');
    });
  });
});
