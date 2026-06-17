'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useGeolocation } from '@/shared/hooks/use-geolocation';
import { isTurnstileEnabled } from '@/shared/lib/turnstile-client';

export type VoteKind = 'CONFIRM' | 'FLAG';

const STORAGE_KEY = 'cwl-voted-reports';

function readVoted(): Record<string, VoteKind> {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function writeVoted(voted: Record<string, VoteKind>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(voted));
  } catch {
    // storage unavailable (e.g. private mode) - the server-side IP dedupe still guards integrity
  }
}

async function postVote(id: string, kind: VoteKind, lat: number, lng: number, turnstileToken: string | null): Promise<void> {
  const res = await fetch(`/api/reports/${id}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, lat, lng, turnstileToken }),
  });

  if (!res.ok) {
    // Surface the server's message (e.g. "too far to vote") instead of a generic failure.
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? 'Nie udało się zapisać głosu. Spróbuj ponownie.');
  }
}

// Confirm/flag a report. A vote is a first-hand claim, so we send the voter's location and the
// server only accepts it when they're near the report. Remembers what you voted (localStorage) so
// the UI can disable the buttons; the real anti-abuse guard is the per-IP unique constraint.
export function useReportVote() {
  const queryClient = useQueryClient();
  const { position, getCurrentPosition } = useGeolocation();
  const [voted, setVoted] = useState<Record<string, VoteKind>>(readVoted);

  const mutation = useMutation({
    mutationFn: ({
      id,
      kind,
      lat,
      lng,
      turnstileToken,
    }: {
      id: string;
      kind: VoteKind;
      lat: number;
      lng: number;
      turnstileToken: string | null;
    }) => postVote(id, kind, lat, lng, turnstileToken),
    onSuccess: (_data, { id, kind }) => {
      const next = { ...voted, [id]: kind };
      setVoted(next);
      writeVoted(next);
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success(kind === 'CONFIRM' ? 'Dziękujemy za potwierdzenie.' : 'Dziękujemy, oznaczono jako nieaktualne.');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Nie udało się zapisać głosu. Spróbuj ponownie.');
    },
  });

  // The token comes from the inline Turnstile widget in the popup (rendered inside the modal so a
  // challenge stays clickable).
  const vote = useCallback(
    async ({ id, kind, turnstileToken }: { id: string; kind: VoteKind; turnstileToken: string | null }) => {
      if (isTurnstileEnabled() && !turnstileToken) {
        toast.error('Potwierdź, że nie jesteś robotem, i spróbuj ponownie.');
        return;
      }

      let coords = position;

      if (!coords) {
        try {
          coords = await getCurrentPosition();
        } catch {
          toast.error('Włącz lokalizację, aby zagłosować przy zgłoszeniu.');
          return;
        }
      }

      mutation.mutate({ id, kind, lat: coords.latitude, lng: coords.longitude, turnstileToken });
    },
    [position, getCurrentPosition, mutation],
  );

  return {
    vote,
    isVoting: mutation.isPending,
    votedKind: (id: string): VoteKind | undefined => voted[id],
  };
}
