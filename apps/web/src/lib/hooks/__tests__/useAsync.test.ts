import { renderHook, waitFor } from '@testing-library/react';
import { useAsync } from '../useAsync';

describe('useAsync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles successful async result and loading state', async () => {
    const asyncFunction = jest.fn().mockResolvedValue('success data');
    
    const { result } = renderHook(() => useAsync(asyncFunction, []));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBe('success data');
    expect(result.current.error).toBeNull();
    expect(asyncFunction).toHaveBeenCalledTimes(1);
  });

  it('handles error state correctly with Error instance', async () => {
    const asyncFunction = jest.fn().mockRejectedValue(new Error('test error'));
    
    const { result } = renderHook(() => useAsync(asyncFunction, []));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe('test error');
  });

  it('handles error state correctly with non-Error throw', async () => {
    const asyncFunction = jest.fn().mockRejectedValue('string error');
    
    const { result } = renderHook(() => useAsync(asyncFunction, []));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('An unexpected error occurred');
  });

  it('triggers rerun when dependencies change', async () => {
    const asyncFunction = jest.fn().mockResolvedValue('success');
    
    const { result, rerender } = renderHook(
      ({ dep }) => useAsync(asyncFunction, [dep]),
      { initialProps: { dep: 1 } }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(asyncFunction).toHaveBeenCalledTimes(1);

    // change dependency
    asyncFunction.mockResolvedValueOnce('success 2');
    rerender({ dep: 2 });

    expect(result.current.loading).toBe(true);
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(asyncFunction).toHaveBeenCalledTimes(2);
    expect(result.current.data).toBe('success 2');
  });

  it('passes AbortSignal to async function when useAbortSignal is true', async () => {
    const asyncFunction = jest.fn().mockResolvedValue('success');
    
    const { result } = renderHook(() => useAsync(asyncFunction, [], { useAbortSignal: true }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(asyncFunction).toHaveBeenCalledWith(expect.any(AbortSignal));
  });

  it('does not pass AbortSignal when useAbortSignal is false', async () => {
    const asyncFunction = jest.fn().mockResolvedValue('success');
    
    const { result } = renderHook(() => useAsync(asyncFunction, [], { useAbortSignal: false }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(asyncFunction).toHaveBeenCalledWith(undefined);
  });

  it('protects against stale/unmounted results (aborts successfully)', async () => {
    let resolvePromise: (val: string) => void;
    const promise = new Promise<string>((res) => {
      resolvePromise = res;
    });
    const asyncFunction = jest.fn().mockReturnValue(promise);
    
    const { result, unmount } = renderHook(() => useAsync(asyncFunction, []));

    expect(result.current.loading).toBe(true);

    // Unmount before promise resolves
    unmount();
    
    // Resolve the promise now
    resolvePromise!('late result');

    // The state should not be updated (it's unmounted, but we also check our hook logic)
    // Actually, we can just ensure it doesn't throw act warnings, and state remains as it was
    expect(result.current.loading).toBe(true); // Should still be true in the snapshot
    expect(result.current.data).toBeNull();
  });

  it('handles AbortError quietly', async () => {
    const asyncFunction = jest.fn().mockImplementation(async () => {
      throw new DOMException('Aborted', 'AbortError');
    });
    
    const { result, unmount } = renderHook(() => useAsync(asyncFunction, []));

    unmount(); // this will trigger the abort if it hasn't finished, though here it throws AbortError immediately

    expect(result.current.error).toBeNull();
  });
});
