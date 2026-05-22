'use client';

import type { BaseConfirmDialogProps } from '@/shared/components/dialog/types';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Spinner,
} from '@/shared/components/ui';

export function AlertConfirmDialog({
  open,
  loading,
  trigger,
  title,
  description,
  onOpenChange,
  onConfirm,
  cancelLabel,
  confirmLabel,
}: BaseConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {!!trigger && <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>}

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{cancelLabel || 'Cancel'}</AlertDialogCancel>

          <Button variant="destructive" disabled={loading} onClick={onConfirm}>
            {loading && <Spinner />}
            {confirmLabel || 'Confirm'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
