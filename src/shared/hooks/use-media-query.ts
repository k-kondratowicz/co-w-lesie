'use client';

import { useEffect, useState } from 'react';

// SSR-safe media query. Defaults to false (mobile-first) until mounted; since consumers only
// render once the user has interacted, there's no first-paint flash.
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const update = () => setMatches(mql.matches);

    update();
    mql.addEventListener('change', update);

    return () => mql.removeEventListener('change', update);
  }, [query]);

  return matches;
}
