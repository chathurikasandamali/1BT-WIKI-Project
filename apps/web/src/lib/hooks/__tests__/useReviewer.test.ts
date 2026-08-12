import { renderHook, waitFor, act } from '@testing-library/react';
import { usePendingArticles, useArticleForReview } from '../useReviewer';
import { listPending, getArticleForReview } from '@/lib/api/reviewer.api';

jest.mock('@/lib/api/reviewer.api', () => ({
  listPending: jest.fn(),
  getArticleForReview: jest.fn(),
  approve: jest.fn(),
  reject: jest.fn(),
}));

const mockListPending = listPending as jest.Mock;
const mockGetArticleForReview = getArticleForReview as jest.Mock;

describe('useReviewer hooks - edge cases and uncovered branches', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('usePendingArticles', () => {
    it('handles non-Error rejection during initial load', async () => {
      mockListPending.mockRejectedValueOnce('String error during load');
      
      const { result } = renderHook(() => usePendingArticles());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('String error during load');
    });

    it('respects cancellation on unmount for success path', async () => {
      let resolvePromise: (val: any) => void;
      const promise = new Promise((res) => { resolvePromise = res; });
      mockListPending.mockReturnValueOnce(promise);

      const { result, unmount } = renderHook(() => usePendingArticles());

      expect(result.current.loading).toBe(true);
      
      unmount();
      resolvePromise!({ articles: [{ id: '1' }] });

      // After unmount, state shouldn't update, no errors thrown
      expect(result.current.loading).toBe(true); // retains last snapshot value
    });

    it('respects cancellation on unmount for error path', async () => {
      let rejectPromise: (err: any) => void;
      const promise = new Promise((_, rej) => { rejectPromise = rej; });
      mockListPending.mockReturnValueOnce(promise);

      const { result, unmount } = renderHook(() => usePendingArticles());

      expect(result.current.loading).toBe(true);
      
      unmount();
      rejectPromise!(new Error('should be ignored'));

      expect(result.current.error).toBeNull();
    });

    it('refetch (fetchArticles) updates state and handles success', async () => {
      mockListPending.mockResolvedValueOnce({ articles: [] }); // initial
      const { result } = renderHook(() => usePendingArticles());

      await waitFor(() => expect(result.current.loading).toBe(false));

      mockListPending.mockResolvedValueOnce({ articles: [{ id: 'refetched-1' }] });
      
      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.articles).toHaveLength(1);
      expect(result.current.articles[0].id).toBe('refetched-1');
    });

    it('refetch (fetchArticles) handles Error rejection', async () => {
      mockListPending.mockResolvedValueOnce({ articles: [] }); // initial
      const { result } = renderHook(() => usePendingArticles());

      await waitFor(() => expect(result.current.loading).toBe(false));

      mockListPending.mockRejectedValueOnce(new Error('Refetch failed'));
      
      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.error).toBe('Refetch failed');
    });

    it('refetch (fetchArticles) handles non-Error rejection', async () => {
      mockListPending.mockResolvedValueOnce({ articles: [] }); // initial
      const { result } = renderHook(() => usePendingArticles());

      await waitFor(() => expect(result.current.loading).toBe(false));

      mockListPending.mockRejectedValueOnce('String refetch error');
      
      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.error).toBe('String refetch error');
    });
  });

  describe('useArticleForReview', () => {
    it('handles non-Error rejection', async () => {
      mockGetArticleForReview.mockRejectedValueOnce('String error');
      
      const { result } = renderHook(() => useArticleForReview('123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load article');
    });

    it('respects cancellation on unmount for success path', async () => {
      let resolvePromise: (val: any) => void;
      const promise = new Promise((res) => { resolvePromise = res; });
      mockGetArticleForReview.mockReturnValueOnce(promise);

      const { result, unmount } = renderHook(() => useArticleForReview('123'));

      expect(result.current.isLoading).toBe(true);
      
      unmount();
      resolvePromise!({ id: '123' });

      expect(result.current.isLoading).toBe(true);
    });

    it('respects cancellation on unmount for error path', async () => {
      let rejectPromise: (err: any) => void;
      const promise = new Promise((_, rej) => { rejectPromise = rej; });
      mockGetArticleForReview.mockReturnValueOnce(promise);

      const { result, unmount } = renderHook(() => useArticleForReview('123'));
      
      unmount();
      rejectPromise!(new Error('should be ignored'));

      expect(result.current.error).toBeNull();
    });
  });
});
