import { useEffect, useState } from 'react';

/**
 * Returns `false` during server render and the first client render, then `true`
 * after mount. Use it to gate time- or locale-dependent output (relative times,
 * `toLocaleString`, etc.) so the server-rendered HTML and the first client
 * render are identical — otherwise React throws a hydration mismatch (#418) in
 * production, which tears down and re-renders the subtree and breaks live
 * updates such as chat streaming.
 */
export function useHasMounted(): boolean {
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- intentional hydration
       guard: the effect runs once after mount and the setState is the entire point. */
    setHasMounted(true);
  }, []);
  return hasMounted;
}
