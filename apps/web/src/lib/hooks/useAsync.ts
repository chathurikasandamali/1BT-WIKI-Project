import type { DependencyList } from 'react';
import { useState, useEffect, useRef } from 'react';

export interface UseAsyncOptions {
  useAbortSignal?: boolean;
}

export interface UseAsyncResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useAsync<T>(
  asyncFunction: (signal?: AbortSignal) => Promise<T>,
  dependencies: DependencyList,
  options: UseAsyncOptions = {}
): UseAsyncResult<T> {
  const { useAbortSignal = true } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Use callbackRef pattern to avoid inline callbacks triggering effect runs
  const asyncFunctionRef = useRef(asyncFunction);
  
  useEffect(() => {
    asyncFunctionRef.current = asyncFunction;
  }, [asyncFunction]);

  useEffect(() => {
    const abortController = useAbortSignal ? new AbortController() : null;
    const signal = abortController?.signal;

    setLoading(true);
    setError(null);

    const executeAsync = async () => {
      try {
        const result = await asyncFunctionRef.current(signal);
        if (signal?.aborted) return;
        setData(result);
      } catch (err) {
        if (signal?.aborted) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    };

    executeAsync();

    return () => {
      if (abortController) {
        abortController.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return { data, loading, error };
}
