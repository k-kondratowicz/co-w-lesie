export type QueueOutcome = 'sent' | 'rejected' | 'retry';

// Rate limit (429), a failed Turnstile (403) and a timeout (408) clear up on their own; any other
// 4xx means the report itself is invalid and will never be accepted.
const RETRYABLE_STATUSES = new Set([403, 408, 429]);

/** null status = the request never reached the server (still offline). */
export function queueOutcomeForStatus(status: number | null): QueueOutcome {
  if (status === null || status >= 500 || RETRYABLE_STATUSES.has(status)) {
    return 'retry';
  }

  return 'rejected';
}
