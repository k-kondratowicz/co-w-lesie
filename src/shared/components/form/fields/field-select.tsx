import type { ReactNode } from 'react';
import { Select, SelectContent, SelectTrigger, SelectValue } from '../../ui/select';
import { useFieldContext } from '../form-hooks';
import { FieldBase, type FieldControlProps } from './field-base';

export function FieldSelect({ children, ...props }: FieldControlProps & { children: ReactNode }) {
  const field = useFieldContext<string>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <FieldBase {...props}>
      <Select onValueChange={(e) => field.handleChange(e)} value={field.state.value}>
        <SelectTrigger aria-invalid={isInvalid} id={field.name} onBlur={field.handleBlur}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </FieldBase>
  );
}
