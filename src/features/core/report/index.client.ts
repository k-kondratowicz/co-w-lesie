// The browser fetch client and the popup store: route handlers importing the slice must not pull
// them into the server graph (server-no-client-surface in .dependency-cruiser.cjs).
export * from './api';
export * from './popup-store';
