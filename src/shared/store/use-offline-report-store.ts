import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CreateReportInput } from '@/features/reports/schemas/create-report.schema';

export type QueuedReport = {
  id: string;
  payload: CreateReportInput;
  queuedAt: string;
};

type OfflineReportState = {
  pending: QueuedReport[];
  enqueue: (payload: CreateReportInput) => void;
  remove: (id: string) => void;
};

// crypto.randomUUID only exists in secure contexts (https/localhost), not over plain http on a
// LAN IP — so fall back to a good-enough local id for the queue.
function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Reports created while offline are persisted here (GPS works offline, so coordinates are valid)
// and flushed to the server when connectivity returns. See OfflineReportSync.
export const useOfflineReportStore = create<OfflineReportState>()(
  persist(
    (set) => ({
      pending: [],
      enqueue: (payload) =>
        set((state) => ({
          pending: [...state.pending, { id: createId(), payload, queuedAt: new Date().toISOString() }],
        })),
      remove: (id) => set((state) => ({ pending: state.pending.filter((report) => report.id !== id) })),
    }),
    { name: 'cwl-offline-reports' },
  ),
);
