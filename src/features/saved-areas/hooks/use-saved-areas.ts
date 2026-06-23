'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { CreateSavedAreaInput } from '@/features/saved-areas/schemas/saved-area.schema';
import type { SavedArea } from '@/features/saved-areas/types';
import { api } from '@/shared/lib/api/client';
import { useVisitorIdStore } from '@/shared/store/use-visitor-id-store';

const QUERY_KEY = ['saved-areas'];

export function useSavedAreas() {
  const visitorId = useVisitorIdStore((state) => state.visitorId);
  const queryClient = useQueryClient();

  const list = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => api.savedAreas.list(visitorId),
    // Serve the persisted list when offline instead of erroring, so saved areas stay browsable.
    networkMode: 'offlineFirst',
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  const create = useMutation({
    mutationFn: (input: CreateSavedAreaInput) => api.savedAreas.create(visitorId, input),
    onSuccess: () => {
      invalidate();
      toast.success('Zapisano obszar.');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Nie udało się zapisać obszaru.');
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.savedAreas.remove(visitorId, id),
    onSuccess: () => {
      invalidate();
      toast.success('Usunięto obszar.');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Nie udało się usunąć obszaru.');
    },
  });

  const rename = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string | null }) => api.savedAreas.rename(visitorId, id, name),
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
