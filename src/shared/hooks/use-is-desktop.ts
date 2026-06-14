'use client';

import { useMediaQuery } from '@/shared/hooks/use-media-query';

export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 768px)');
}
