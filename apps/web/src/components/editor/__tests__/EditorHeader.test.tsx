import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditorHeader } from '../EditorHeader';

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
let mockContextState: Record<string, unknown> = {};

jest.mock('@/components/editor/EditorDraftContext', () => ({
  useEditorDraft: () => ({
    articleStatus: 'Draft',
    initialStatus: 'Draft',
    saveStatus: 'idle',
    lastSavedAt: null,
    lastError: null,
    saveDraft: mockSaveDraft,
    submitForReview: mockSubmitForReview,
    ...mockContextState,
  }),
}));

const mockShowToast = jest.fn();

jest.mock('@/lib/hooks/useAutoDismissToast', () => ({
  useAutoDismissToast: () => ({
    isVisible: false,
    message: '',
    showToast: mockShowToast,
  }),
  DRAFT_SAVED_MESSAGE: 'Draft saved',
}));

jest.mock('gsap', () => ({
  __esModule: true,
  default: {
    registerPlugin: jest.fn(),
    killTweensOf: jest.fn(),
    to: jest.fn(),
    fromTo: jest.fn(),
    set: jest.fn(),
  },
}));

jest.mock('@gsap/react', () => ({
  useGSAP: jest.fn((cb) => cb()),
}));

describe('EditorHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockContextState = {};
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

  describe('Mode Toggle', () => {
    it('calls setMode when clicking mode buttons', async () => {
      const setMode = jest.fn();
      render(<EditorHeader mode="compose" setMode={setMode} />);
      
      const previewButton = screen.getByRole('button', { name: /preview/i });
      await userEvent.click(previewButton);
      expect(setMode).toHaveBeenCalledWith('preview');
      
      const composeButton = screen.getByRole('button', { name: /compose/i });
      await userEvent.click(composeButton);
      expect(setMode).toHaveBeenCalledWith('compose');
    });
  });

  describe('Save Draft', () => {
    it('calls saveDraft and shows success toast when clicking save draft', async () => {
      mockSaveDraft.mockResolvedValueOnce(undefined);
      render(<EditorHeader mode="compose" setMode={jest.fn()} />);
      
      const saveBtn = screen.getByRole('button', { name: /save draft/i });
      await userEvent.click(saveBtn);
      
      expect(mockSaveDraft).toHaveBeenCalled();
      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Draft saved');
      });
    });

    it('handles saveDraft failure gracefully', async () => {
      mockSaveDraft.mockRejectedValueOnce(new Error('Save failed'));
      render(<EditorHeader mode="compose" setMode={jest.fn()} />);
      
      const saveBtn = screen.getByRole('button', { name: /save draft/i });
      await userEvent.click(saveBtn);
      
      expect(mockSaveDraft).toHaveBeenCalled();
      // Toast shouldn't be called for error here because error state is in context and 
      // the error is swallowed in handleSaveDraft catch block
      await waitFor(() => {
        expect(mockShowToast).not.toHaveBeenCalled();
      });
    });
    
    it('disables save button when saveStatus is saving', () => {
      mockContextState = { saveStatus: 'saving' };
      render(<EditorHeader mode="compose" setMode={jest.fn()} />);
      
      const saveBtn = screen.getByRole('button', { name: /save draft/i });
      expect(saveBtn).toBeDisabled();
    });
  });

  describe('Submit for Review', () => {
    it('opens confirmation modal and then submits on confirm', async () => {
      mockSubmitForReview.mockResolvedValueOnce(undefined);
      render(<EditorHeader mode="compose" setMode={jest.fn()} />);
      
      const submitBtn = screen.getByRole('button', { name: /submit for review/i });
      await userEvent.click(submitBtn);
      
      // Modal should appear
      expect(screen.getByText('Are you sure you want to submit this article for review? It will be locked from further edits until a reviewer approves or rejects it.')).toBeInTheDocument();
      
      // Click confirm in the modal
      const confirmBtn = screen.getByRole('button', { name: 'Submit' });
      await userEvent.click(confirmBtn);
      
      expect(mockSubmitForReview).toHaveBeenCalled();
      
      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Article submitted for review successfully.');
        expect(mockRouterPush).toHaveBeenCalledWith('/my-articles');
      });
    });
    
    it('shows error toast on submission failure', async () => {
      mockSubmitForReview.mockRejectedValueOnce(new Error('Submit failed'));
      mockContextState = { lastError: 'Custom error from backend' };
      render(<EditorHeader mode="compose" setMode={jest.fn()} />);
      
      const submitBtn = screen.getByRole('button', { name: /submit for review/i });
      await userEvent.click(submitBtn);
      
      const confirmBtn = screen.getByRole('button', { name: 'Submit' });
      await userEvent.click(confirmBtn);
      
      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Custom error from backend');
        expect(mockRouterPush).not.toHaveBeenCalled(); // Should not redirect on fail
      });
    });

    it('disables submit button when already published', () => {
      mockContextState = { articleStatus: 'Pending Review' };
      render(<EditorHeader mode="compose" setMode={jest.fn()} />);
      
      const submitBtn = screen.getByRole('button', { name: /submit for review/i });
      expect(submitBtn).toBeDisabled();
    });

    it('shows Re-submit for Review label when initial status is Rejected', () => {
      mockContextState = { initialStatus: 'Rejected' };
      render(<EditorHeader mode="compose" setMode={jest.fn()} />);
      
      const submitBtn = screen.getByRole('button', { name: /re-submit for review/i });
      expect(submitBtn).toBeInTheDocument();
    });
  });
});
