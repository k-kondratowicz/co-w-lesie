'use client';

import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { environmentManager, QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';

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

// Persist the query cache to localStorage so the last-seen reports/bans render offline. Guarded
// so it no-ops during SSR (no window) - the provider itself is a client component.
const persister = createAsyncStoragePersister({
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  key: 'cwl-query-cache',
});

export function QueryClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <PersistQueryClientProvider client={getQueryClient()} persistOptions={{ persister, maxAge: DAY_MS, buster: 'v1' }}>
      {children}
    </PersistQueryClientProvider>
  );
}
