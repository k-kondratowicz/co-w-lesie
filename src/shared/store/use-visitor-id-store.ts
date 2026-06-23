import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// crypto.randomUUID only exists in secure contexts (https/localhost), not over plain http on a
// LAN IP - so fall back to a good-enough local id. Mirrors useOfflineReportStore's createId.
function createVisitorId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

type VisitorIdState = {
  visitorId: string;
};

// Anonymous, persisted device identifier (no accounts). Sent as the x-visitor-id header so the
// server can scope a visitor's saved areas. Treated as an unguessable bearer, not auth.
export const useVisitorIdStore = create<VisitorIdState>()(
  persist(() => ({ visitorId: createVisitorId() }), { name: 'cwl-visitor-id' }),
);
