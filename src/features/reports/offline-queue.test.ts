import { describe, expect, it } from 'vitest';
import { queueOutcomeForStatus } from './offline-queue';

describe('queueOutcomeForStatus', () => {
  it('keeps a report queued while offline or on a server error', () => {
    expect(queueOutcomeForStatus(null)).toBe('retry');
    expect(queueOutcomeForStatus(503)).toBe('retry');
  });

  it('keeps a report queued when rate limited or Turnstile fails', () => {
    expect(queueOutcomeForStatus(429)).toBe('retry');
    expect(queueOutcomeForStatus(403)).toBe('retry');
  });

  it('drops a report the server will never accept', () => {
    expect(queueOutcomeForStatus(400)).toBe('rejected');
    expect(queueOutcomeForStatus(422)).toBe('rejected');
  });
});
