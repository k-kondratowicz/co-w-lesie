import type { ReactNode } from 'react';
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from '../../ui/field';
import { useFieldContext } from '../form-hooks';

export interface FieldControlProps {
  label: string;
  description?: string;
}

interface FieldBaseProps extends FieldControlProps {
  children: ReactNode;
  horizontal?: boolean;
  controlFirst?: boolean;
}

export function FieldBase({ children, label, description, controlFirst, horizontal }: FieldBaseProps) {
  const field = useFieldContext();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
  const labelElement = (
    <>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      {description && <FieldDescription>{description}</FieldDescription>}
    </>
  );
  const errorElem = isInvalid && <FieldError errors={field.state.meta.errors} />;

  return (
    <Field data-invalid={isInvalid} orientation={horizontal ? 'horizontal' : undefined}>
      {controlFirst ? (
        <>
          {children}
          <FieldContent>
            {labelElement}
            {errorElem}
          </FieldContent>
        </>
      ) : (
        <>
          <FieldContent>{labelElement}</FieldContent>
          {children}
          {errorElem}
        </>
      )}
    </Field>
  );
}
