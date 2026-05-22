'use client';

import { Button } from '../ui/button';
import { Spinner } from '../ui/spinner';
import { useFormContext } from './form-hooks';

export function FormSubmit({ children, disabled, ...props }: React.ComponentProps<typeof Button>) {
  const form = useFormContext();

  return (
    <form.Subscribe selector={(state) => [state.isSubmitting]}>
      {([isSubmitting]) => (
        <Button type="submit" disabled={isSubmitting || disabled} {...props}>
          {isSubmitting && <Spinner />}
          {children}
        </Button>
      )}
    </form.Subscribe>
  );
}
