'use client';

import type { ConfirmDialogProps } from '@/shared/components/dialog/types';
import { ActionDialog } from './action-dialog';

export function ConfirmDialog({
  open,
  loading,
  trigger,
  title,
  description,
  confirmLabel,
  cancelLabel,
  isDisabled,
  onOpenChange,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <ActionDialog
      open={open}
      loading={loading}
      trigger={trigger}
      title={title}
      description={description}
      isDisabled={isDisabled}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      cancelLabel={cancelLabel}
      confirmLabel={confirmLabel}
    />
  );
}
