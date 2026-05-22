'use client';

import { useCallback, useState } from 'react';
import type { UseConfirmDialogOptions } from '../types';

export function useActionDialog(options?: UseConfirmDialogOptions) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const setOpenSafe = useCallback(
    (open: boolean) => {
      if (!open && loading) {
        return;
      }

      setOpen(open);
      options?.onOpenChange?.(open);
    },
    [options?.onOpenChange, loading],
  );

  const confirm = useCallback(async () => {
    if (!options?.onConfirm || loading) {
      return;
    }

    setLoading(true);
    try {
      const shouldClose = await options?.onConfirm();

      if (shouldClose !== false) {
        setOpenSafe(false);
      }
    } catch (error) {
      console.error('Error in confirm action:', error);
    } finally {
      setLoading(false);
    }
  }, [options?.onConfirm, loading, setOpenSafe]);

  return {
    open,
    loading,
    setOpen: setOpenSafe,
    confirm,
  };
}
