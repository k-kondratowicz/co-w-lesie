'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useVisitorIdStore } from '@/shared/store/use-visitor-id-store';
import { savedAreasApi } from './api';
import type { CreateSavedAreaInput } from './schema';
import type { SavedArea } from './types';

export function useSavedAreas() {
  const visitorId = useVisitorIdStore((state) => state.visitorId);
  const queryClient = useQueryClient();

  // Scope the cache to the visitor: the list is visitor-specific, so a changed visitorId (storage
  // reset, migration, debug tooling) must not read another visitor's cached areas under one key.
  const queryKey = ['saved-areas', visitorId];

  const list = useQuery({
    queryKey,
    queryFn: () => savedAreasApi.list(visitorId),
    // Serve the persisted list when offline instead of erroring, so saved areas stay browsable.
    networkMode: 'offlineFirst',
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const create = useMutation({
    mutationFn: (input: CreateSavedAreaInput) => savedAreasApi.create(visitorId, input),
    onSuccess: () => {
      invalidate();
      toast.success('Zapisano obszar.');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Nie udało się zapisać obszaru.');
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => savedAreasApi.remove(visitorId, id),
    onSuccess: () => {
      invalidate();
      toast.success('Usunięto obszar.');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Nie udało się usunąć obszaru.');
    },
  });

  const rename = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string | null }) => savedAreasApi.rename(visitorId, id, name),
    onSuccess: () => invalidate(),
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Nie udało się zmienić nazwy.');
    },
  });

  const areas: SavedArea[] = list.data ?? [];

  return {
    areas,
    isLoading: list.isLoading,
    isError: list.isError,
    create,
    remove,
    rename,
  };
}
