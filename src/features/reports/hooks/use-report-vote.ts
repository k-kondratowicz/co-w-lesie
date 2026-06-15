'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

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

async function postVote(id: string, kind: VoteKind): Promise<void> {
  const res = await fetch(`/api/reports/${id}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind }),
  });

  if (!res.ok) {
    throw new Error(`Vote failed (${res.status})`);
  }
}

// Confirm/flag a report. Remembers what you voted (localStorage) so the UI can disable the
// buttons; the real anti-abuse guard is the per-IP unique constraint on the server.
export function useReportVote() {
  const queryClient = useQueryClient();
  const [voted, setVoted] = useState<Record<string, VoteKind>>(readVoted);

  const mutation = useMutation({
    mutationFn: ({ id, kind }: { id: string; kind: VoteKind }) => postVote(id, kind),
    onSuccess: (_data, { id, kind }) => {
      const next = { ...voted, [id]: kind };
      setVoted(next);
      writeVoted(next);
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success(kind === 'CONFIRM' ? 'Dziękujemy za potwierdzenie.' : 'Dziękujemy, oznaczono jako nieaktualne.');
    },
    onError: () => {
      toast.error('Nie udało się zapisać głosu. Spróbuj ponownie.');
    },
  });

  return {
    vote: mutation.mutate,
    isVoting: mutation.isPending,
    votedKind: (id: string): VoteKind | undefined => voted[id],
  };
}
