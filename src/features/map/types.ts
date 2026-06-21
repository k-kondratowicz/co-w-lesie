export type BanFeatureProperties = {
  id: string;
  reason: string | null;
  until: string | null;
};

export type BansGeoJSON = GeoJSON.FeatureCollection<GeoJSON.Geometry, BanFeatureProperties>;

export type KmzbFeatureProperties = {
  id: string;
  type: string;
  status: string;
  eventAt: string | null;
  createdAt: string;
};

export type KmzbGeoJSON = GeoJSON.FeatureCollection<GeoJSON.Geometry, KmzbFeatureProperties>;
