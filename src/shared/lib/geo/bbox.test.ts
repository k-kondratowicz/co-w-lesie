import { describe, expect, it } from 'vitest';
import { type Bbox, bboxParamSchema, formatBbox, snapBboxToGrid } from './bbox';

const CELL_AT_ZOOM_10 = 360 / 2 ** 12;

describe('snapBboxToGrid', () => {
  it('snaps outward so nearby viewports share one key', () => {
    const expected: Bbox = [19.86328125, 50.009765625, 20.126953125, 50.09765625];

    expect(snapBboxToGrid([19.93, 50.01, 20.05, 50.09], 10)).toEqual(expected);
    expect(snapBboxToGrid([19.95, 50.02, 20.06, 50.08], 10)).toEqual(expected);
  });

  it('keeps one grid across a zoom level, so a slight pinch does not change the key', () => {
    const viewport: Bbox = [19.93, 50.01, 20.05, 50.09];

    expect(snapBboxToGrid(viewport, 10.9)).toEqual(snapBboxToGrid(viewport, 10));
  });

  // A non-binary step like 0.05 pushed on-grid edges one cell outward (0.15 snapped down to 0.10).
  it('leaves edges that already sit on the grid in place', () => {
    const onGrid: Bbox = [227 * CELL_AT_ZOOM_10, 569 * CELL_AT_ZOOM_10, 229 * CELL_AT_ZOOM_10, 570 * CELL_AT_ZOOM_10];

    expect(snapBboxToGrid(onGrid, 10)).toEqual(onGrid);
  });

  it('scales the cell with zoom, so a street-level viewport is not over-fetched', () => {
    const viewport: Bbox = [19.94, 50.06, 19.9486, 50.0705];
    const [minLng, minLat, maxLng, maxLat] = snapBboxToGrid(viewport, 16);

    expect(minLng).toBeLessThanOrEqual(viewport[0]);
    expect(minLat).toBeLessThanOrEqual(viewport[1]);
    expect(maxLng).toBeGreaterThanOrEqual(viewport[2]);
    expect(maxLat).toBeGreaterThanOrEqual(viewport[3]);
    expect((maxLng - minLng) / (viewport[2] - viewport[0])).toBeLessThan(1.5);
    expect((maxLat - minLat) / (viewport[3] - viewport[1])).toBeLessThan(1.5);
  });
});

describe('formatBbox', () => {
  it('round-trips through bboxParamSchema', () => {
    const bbox = snapBboxToGrid([19.93, 50.01, 20.05, 50.09], 10);

    expect(bboxParamSchema.parse(formatBbox(bbox))).toEqual(bbox);
  });
});
