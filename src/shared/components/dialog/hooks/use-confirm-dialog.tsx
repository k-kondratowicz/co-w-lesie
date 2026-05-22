'use client';

import type { UseConfirmDialogOptions } from '../types';
import { useActionDialog } from './use-action-dialog';

export function useConfirmDialog(options?: UseConfirmDialogOptions) {
  return useActionDialog(options);
}
