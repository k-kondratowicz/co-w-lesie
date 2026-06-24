import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CreateReportInput } from '@/features/reports/schemas/create-report.schema';
import { createRandomId } from '@/shared/lib/random-id';

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

// Reports created while offline are persisted here (GPS works offline, so coordinates are valid)
// and flushed to the server when connectivity returns. See OfflineReportSync.
export const useOfflineReportStore = create<OfflineReportState>()(
  persist(
    (set) => ({
      pending: [],
      enqueue: (payload) =>
        set((state) => ({
          pending: [...state.pending, { id: createRandomId(), payload, queuedAt: new Date().toISOString() }],
        })),
      remove: (id) => set((state) => ({ pending: state.pending.filter((report) => report.id !== id) })),
    }),
    { name: 'cwl-offline-reports' },
  ),
);
