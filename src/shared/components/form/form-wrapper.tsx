'use client';

import { cn } from '@/shared/lib/utils';
import { useFormContext } from './form-hooks';

export function FormWrapper({ className, ...props }: Omit<React.ComponentProps<'form'>, 'onSubmit'>) {
  const form = useFormContext();

  return (
    <form
      className={cn('flex flex-col gap-3 sm:gap-4', className)}
      onSubmit={(event) => {
        event.stopPropagation();
        event.preventDefault();
        form.handleSubmit();
      }}
      {...props}
    />
  );
}
