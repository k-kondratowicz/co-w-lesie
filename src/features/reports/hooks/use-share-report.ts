'use client';

import { usePathname } from 'next/navigation';
import { useCallback } from 'react';
import { toast } from 'sonner';

export function useShareReport() {
  const pathname = usePathname();

  return useCallback(
    async (reportId: string) => {
      const params = new URLSearchParams({ report: reportId });
      const url = `${window.location.origin}${pathname}?${params}`;

      if (navigator.share) {
        try {
          await navigator.share({ url });

          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') {
            return;
          }
        }
      }

      if (!navigator.clipboard?.writeText) {
        toast.error('Kopiowanie do schowka nie jest dostępne w tej przeglądarce');

        return;
      }

      toast.promise(navigator.clipboard.writeText(url), {
        loading: 'Kopiowanie linku...',
        success: 'Link został skopiowany do schowka',
        error: 'Nie udało się skopiować linku do schowka',
      });
    },
    [pathname],
  );
}
