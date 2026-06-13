'use client';

import type React from 'react';
import type { BaseConfirmDialogProps } from '@/shared/components/dialog';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Spinner,
} from '@/shared/components/ui';

interface ActionDialogProps extends BaseConfirmDialogProps {
  children?: React.ReactNode;

  isDisabled?: boolean;
  isSaveDisabled?: boolean;
  isSaveHidden?: boolean;
}

export function ActionDialog({
  open,
  loading,
  trigger,
  title,
  description,
  children,
  isDisabled,
  isSaveDisabled,
  isSaveHidden,
  onOpenChange,
  onConfirm,
  cancelLabel,
  confirmLabel,
}: ActionDialogProps) {
  return (
    <Dialog modal open={open} onOpenChange={onOpenChange}>
      {!!trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="max-w-full">{children}</div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {cancelLabel ?? 'Anuluj'}
          </Button>

          {!isSaveHidden && (
            <Button onClick={onConfirm} disabled={isDisabled || isSaveDisabled || loading}>
              {!!loading && <Spinner />}
              {confirmLabel ?? 'Zapisz'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
