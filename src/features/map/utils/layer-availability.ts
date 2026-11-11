import type { QueryObserverResult } from '@tanstack/react-query';

export type LayerQueryState = Pick<QueryObserverResult, 'fetchStatus' | 'isPending' | 'isPlaceholderData' | 'isLoadingError'>;

/**
 * True when a viewport layer has nothing of its own to draw for the current bbox: offline with no
 * cached result for it (the query is paused, at most still showing the previous viewport), or a first
 * fetch that failed. Such a layer is unknown, not empty - see docs/business-rules.md, "Safety rule".
 */
export function isLayerUnavailable({ fetchStatus, isPending, isPlaceholderData, isLoadingError }: LayerQueryState): boolean {
  if (isLoadingError) {
    return true;
  }

  return fetchStatus === 'paused' && (isPending || isPlaceholderData);
}
