import { ReportType } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { ageOpacity, expiryFrom, FLAG_DISPUTE_THRESHOLD, reportTtlMs } from './lifecycle';

const HOUR_MS = 60 * 60 * 1000;

describe('reportTtlMs', () => {
  it('gives time-critical types a short life and persistent ones a long one', () => {
    expect(reportTtlMs('FIRE')).toBe(24 * HOUR_MS);
    expect(reportTtlMs('DEAD_ANIMAL')).toBe(168 * HOUR_MS); // 7 days
    expect(reportTtlMs('ILLEGAL_DUMP')).toBe(720 * HOUR_MS); // 30 days
    expect(reportTtlMs('FIRE')).toBeLessThan(reportTtlMs('ILLEGAL_DUMP'));
  });

  it('defines a positive TTL for every report type', () => {
    for (const type of Object.values(ReportType)) {
      expect(reportTtlMs(type)).toBeGreaterThan(0);
    }
  });
});

describe('expiryFrom', () => {
  it('adds the type TTL to the given time', () => {
    const from = new Date('2026-06-15T10:00:00.000Z');

    expect(expiryFrom('FIRE', from).toISOString()).toBe('2026-06-16T10:00:00.000Z');
  });
});

describe('ageOpacity', () => {
  const created = new Date('2026-06-15T00:00:00.000Z');

  it('is fully opaque for a brand-new report', () => {
    expect(ageOpacity('FIRE', created, created)).toBe(1);
  });

  it('reaches the floor (0.35) at and beyond expiry', () => {
    const ttl = reportTtlMs('FIRE');
    expect(ageOpacity('FIRE', created, new Date(created.getTime() + ttl))).toBe(0.35);
    expect(ageOpacity('FIRE', created, new Date(created.getTime() + ttl * 5))).toBe(0.35);
  });

  it('fades monotonically and stays within [0.35, 1]', () => {
    const ttl = reportTtlMs('FIRE');
    const fresh = ageOpacity('FIRE', created, new Date(created.getTime() + ttl * 0.25));
    const older = ageOpacity('FIRE', created, new Date(created.getTime() + ttl * 0.75));

    expect(fresh).toBeGreaterThan(older);
    expect(older).toBeGreaterThanOrEqual(0.35);
    expect(fresh).toBeLessThanOrEqual(1);
  });

  it('never exceeds 1 when the anchor is in the future (clock skew)', () => {
    const past = new Date(created.getTime() - reportTtlMs('FIRE'));

    expect(ageOpacity('FIRE', created, past)).toBe(1);
  });
});

describe('FLAG_DISPUTE_THRESHOLD', () => {
  it('hides a report once flags outweigh confirmations by 2', () => {
    expect(FLAG_DISPUTE_THRESHOLD).toBe(2);
  });
});
