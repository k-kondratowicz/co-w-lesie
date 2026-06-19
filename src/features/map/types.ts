export type BanFeatureProperties = {
  id: string;
  reason: string | null;
  until: string | null;
};

export type BansGeoJSON = GeoJSON.FeatureCollection<GeoJSON.Geometry, BanFeatureProperties>;
