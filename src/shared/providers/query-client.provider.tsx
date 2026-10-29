'use client';

import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { environmentManager, QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider, removeOldestQuery } from '@tanstack/react-query-persist-client';
import { del, get, set } from 'idb-keyval';

const DAY_MS = 1000 * 60 * 60 * 24;

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60,
        // Keep cached data long enough to survive an offline reload (must be >= persist maxAge).
        gcTime: DAY_MS,
        experimental_prefetchInRender: true,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient(): QueryClient {
  if (environmentManager.isServer()) {
    return makeQueryClient();
  }

  browserQueryClient ??= makeQueryClient();

  return browserQueryClient;
}

// IndexedDB, not localStorage: the snapshot runs to several MB, and a localStorage write blocks the
// main thread and stops at ~5 MB. The old localStorage snapshot is read until the first IndexedDB
// write replaces it, so results cached before the switch still work offline.
const storage =
  typeof window === 'undefined'
    ? undefined
    : {
        getItem: async (key: string) => (await get<string>(key)) ?? window.localStorage.getItem(key),
        setItem: async (key: string, value: string) => {
          await set(key, value);
          window.localStorage.removeItem(key);
        },
        removeItem: async (key: string) => {
          await del(key);
          window.localStorage.removeItem(key);
        },
      };

const persister = createAsyncStoragePersister({
  storage,
  key: 'cwl-query-cache',
  // Over quota, drop the oldest query and retry rather than keep an ever older snapshot.
  retry: removeOldestQuery,
});

export function QueryClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <PersistQueryClientProvider client={getQueryClient()} persistOptions={{ persister, maxAge: DAY_MS, buster: 'v1' }}>
      {children}
    </PersistQueryClientProvider>
  );
}
