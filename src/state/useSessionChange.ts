import {useEffect, useRef} from 'react';

/**
 * Runs `reset` when one session (its client) is replaced by another. Not when
 * the first one arrives: the routes mount with it and start loading in their own
 * effects before this one runs, so a reset then would throw their first
 * requests away and repeat them.
 */
export function useSessionChange(api: unknown, reset: () => void): void {
  const previous = useRef<unknown>(api);
  const resetRef = useRef(reset);
  resetRef.current = reset;
  useEffect(() => {
    // `previous` keeps the last real session, so signing out and in again as
    // someone else still resets.
    if (api != null && previous.current !== api) {
      const replaced = previous.current != null;
      previous.current = api;
      if (replaced) {
        resetRef.current();
      }
    }
  }, [api]);
}
