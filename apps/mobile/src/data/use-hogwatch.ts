import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';

export type ResourceState<T> = {
  data?: T;
  error?: string;
  loading: boolean;
  refreshing: boolean;
  /** Re-runs the loader. Wired to pull-to-refresh and to the error retry. */
  reload: () => void;
};

/**
 * Keeps repository I/O out of route components while giving every screen a
 * retry and a pull-to-refresh. A failed load used to be a dead end until the
 * app was killed.
 */
export function useHogWatchResource<T>(load: () => Promise<T>, dependencies: DependencyList): ResourceState<T> {
  const [state, setState] = useState<{ data?: T; error?: string; loading: boolean; refreshing: boolean }>({ loading: true, refreshing: false });
  const [attempt, setAttempt] = useState(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  const reload = useCallback(() => setAttempt((current) => current + 1), []);

  useEffect(() => {
    let active = true;
    setState((current) => current.data === undefined
      ? { loading: true, refreshing: false }
      : { ...current, refreshing: true, error: undefined });
    loadRef.current().then(
      (data) => { if (active) setState({ data, loading: false, refreshing: false }); },
      (error: unknown) => {
        if (!active) return;
        setState((current) => ({
          data: current.data,
          loading: false,
          refreshing: false,
          error: error instanceof Error && error.message ? error.message : 'HogWatch could not load this report.',
        }));
      },
    );
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies, attempt]);

  return { ...state, reload };
}
