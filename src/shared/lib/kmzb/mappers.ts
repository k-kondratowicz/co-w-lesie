import type { KmzbPointFeature } from './schemas';

// Pure transforms (no I/O) so they are unit-testable. The service speaks EPSG:2180; we carry the
// raw 2180 easting/northing through and let PostGIS reproject to 4326 on insert (ST_Transform),
// per the spatial conventions ("let the server reproject; never reproject by hand").

export function kmzbMsToDate(ms: number | null | undefined): Date | null {
  return ms ? new Date(ms) : null;
}

export type KmzbRow = {
  id: string;
  type: string;
  status: string;
  teryt: string | null;
  eventAt: Date | null;
  createdAt: Date;
  x: number;
  y: number;
};

export function toKmzbRow(feature: KmzbPointFeature): KmzbRow {
  const { attributes, geometry } = feature;

  return {
    id: String(attributes.OBJECTID),
    type: attributes.Typ,
    status: attributes.Status,
    teryt: attributes.TERYT ?? null,
    eventAt: kmzbMsToDate(attributes['Data zdarzenia']),
    createdAt: new Date(attributes['Data utworzenia']),
    x: geometry.x,
    y: geometry.y,
  };
}
