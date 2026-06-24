import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createRandomId } from '@/shared/lib/random-id';

type VisitorIdState = {
  visitorId: string;
};

const STORAGE_KEY = 'cwl-visitor-id';

// Anonymous, persisted device identifier (no accounts). Sent as the x-visitor-id header so the
// server can scope a visitor's saved areas. Treated as an unguessable bearer, not auth.
export const useVisitorIdStore = create<VisitorIdState>()(
  persist(() => ({ visitorId: createRandomId() }), { name: STORAGE_KEY }),
);

// persist only writes on a state change, and this store never calls set(). Without this, the id
// minted in the initializer would never reach localStorage: every refresh would generate a fresh
// one and silently orphan the visitor's saved areas. Persist it once on a first-ever visit.
if (typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_KEY) === null) {
  useVisitorIdStore.setState((state) => ({ visitorId: state.visitorId }));
}
