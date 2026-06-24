// Client-only surface of the saved-area slice: useSavedAreas pulls react-query + sonner and is a
// 'use client' module. Kept out of index.ts so server code (the /api/saved-areas route) importing
// the slice does not drag the client runtime into its module graph. Named index.client.ts (not
// client.ts) to avoid colliding with the bdl/kmzb "client" = HTTP API client.
export * from './use-saved-areas';
