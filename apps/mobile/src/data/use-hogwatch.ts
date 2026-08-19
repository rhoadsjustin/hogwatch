import { useEffect, useState, type DependencyList } from 'react';

export type ResourceState<T> = {
  data?: T;
  error?: string;
  loading: boolean;
};

/** Keeps repository I/O out of route components while preserving a small native loading state. */
export function useHogWatchResource<T>(load: () => Promise<T>, dependencies: DependencyList): ResourceState<T> {
  const [state, setState] = useState<ResourceState<T>>({ loading: true });

  useEffect(() => {
    let active = true;
    setState({ loading: true });
    load().then(
      (data) => { if (active) setState({ data, loading: false }); },
      () => { if (active) setState({ error: 'HogWatch could not load this report. Please try again.', loading: false }); },
    );
    return () => { active = false; };
  }, dependencies);

  return state;
}
