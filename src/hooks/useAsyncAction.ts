import { useState, useCallback } from 'react';

/** Wraps an async function, tracking loading/error state */
export function useAsyncAction<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
): { run: (...args: T) => Promise<R | undefined>; isLoading: boolean; error: string | null } {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (...args: T): Promise<R | undefined> => {
    setIsLoading(true);
    setError(null);
    try {
      return await fn(...args);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, [fn]);

  return { run, isLoading, error };
}

