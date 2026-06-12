import { describe, expect, it } from 'vitest';
import { buildPointContext, type PointContextRow } from './point-context';

const KRAKOW = { lng: 19.9445, lat: 50.0647 }; // inside Poland (and forest coverage)
const PARIS = { lng: 2.3522, lat: 48.8566 }; // outside Poland

const baseRow: PointContextRow = {
  in_forest: false,
  fire_degree: null,
  fire_updated_at: null,
  ban_reason: null,
  ban_until: null,
  has_ban: false,
};

describe('buildPointContext', () => {
  it('reports IN / OUT for forest coverage inside Poland', () => {
    const inside = buildPointContext({ ...baseRow, in_forest: true }, KRAKOW.lng, KRAKOW.lat);
    expect(inside.inForest.status).toBe('IN');

    const outside = buildPointContext({ ...baseRow, in_forest: false }, KRAKOW.lng, KRAKOW.lat);
    expect(outside.inForest.status).toBe('OUT');
  });

  it('maps a fire degree to OK with the degree (including 0 = no hazard but known)', () => {
    const hazard = buildPointContext({ ...baseRow, fire_degree: 2 }, KRAKOW.lng, KRAKOW.lat);
    expect(hazard.fire).toMatchObject({ status: 'OK', degree: 2 });

    const calm = buildPointContext({ ...baseRow, fire_degree: 0 }, KRAKOW.lng, KRAKOW.lat);
    expect(calm.fire).toMatchObject({ status: 'OK', degree: 0 });
  });

  it('reports an active ban with its reason and until', () => {
    const until = new Date('2026-12-31T00:00:00Z');
    const ctx = buildPointContext(
      { ...baseRow, has_ban: true, ban_reason: 'inne przyczyny', ban_until: until },
      KRAKOW.lng,
      KRAKOW.lat,
    );
    expect(ctx.entryBan).toEqual({ status: 'BAN', reason: 'inne przyczyny', until: until.toISOString() });
  });

  it('reports NONE when no ban and no fire data', () => {
    const ctx = buildPointContext(baseRow, KRAKOW.lng, KRAKOW.lat);
    expect(ctx.entryBan.status).toBe('NONE');
    expect(ctx.fire.status).toBe('UNKNOWN');
  });

  it('is all UNKNOWN outside Poland, regardless of row contents (safety rule)', () => {
    const ctx = buildPointContext({ ...baseRow, in_forest: true, fire_degree: 3, has_ban: true }, PARIS.lng, PARIS.lat);
    expect(ctx.inForest.status).toBe('UNKNOWN');
    expect(ctx.fire.status).toBe('UNKNOWN');
    expect(ctx.entryBan.status).toBe('UNKNOWN');
  });
});
