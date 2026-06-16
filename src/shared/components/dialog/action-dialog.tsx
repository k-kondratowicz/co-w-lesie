'use client';

import type React from 'react';
import type { BaseConfirmDialogProps } from '@/shared/components/dialog';
import { Button, Spinner } from '@/shared/components/ui';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogScrollArea,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from '@/shared/components/ui/responsive-dialog';

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
    <ResponsiveDialog modal open={open} onOpenChange={onOpenChange}>
      {!!trigger && <ResponsiveDialogTrigger asChild>{trigger}</ResponsiveDialogTrigger>}

      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{title}</ResponsiveDialogTitle>
          {description && <ResponsiveDialogDescription>{description}</ResponsiveDialogDescription>}
        </ResponsiveDialogHeader>

        <ResponsiveDialogScrollArea>
          <>
            {children}

            <ResponsiveDialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                {cancelLabel ?? 'Anuluj'}
              </Button>

              {!isSaveHidden && (
                <Button onClick={onConfirm} disabled={isDisabled || isSaveDisabled || loading}>
                  {!!loading && <Spinner />}
                  {confirmLabel ?? 'Zapisz'}
                </Button>
              )}
            </ResponsiveDialogFooter>
          </>
        </ResponsiveDialogScrollArea>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
