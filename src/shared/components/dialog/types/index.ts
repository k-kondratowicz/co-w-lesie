import type { ReactNode } from 'react';

export interface BaseConfirmDialogProps {
  open: boolean;
  loading?: boolean;
  wide?: boolean;

  trigger: ReactNode | null;

  title: string | ReactNode;
  description?: string | ReactNode;

  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;

  cancelLabel?: string;
  confirmLabel?: string;
}

export interface ConfirmDialogProps extends BaseConfirmDialogProps {
  isDisabled?: boolean;
}

export interface UseConfirmDialogOptions {
  onConfirm?: () => Promise<boolean | null | undefined> | Promise<void>;
  onOpenChange?: (open: boolean) => void;

  // closeOnSuccess?: boolean; // default true
}
