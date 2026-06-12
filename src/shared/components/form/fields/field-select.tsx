import type { PropsWithChildren } from 'react';
import { Select, SelectContent, SelectTrigger, SelectValue } from '../../ui/select';
import { useFieldContext } from '../form-hooks';
import { FieldBase, type FieldControlProps } from './field-base';

export function FieldSelect({ children, ...props }: FieldControlProps & Required<PropsWithChildren>) {
  const field = useFieldContext<string>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <FieldBase {...props}>
      <Select onValueChange={(e) => field.handleChange(e)} value={field.state.value}>
        <SelectTrigger aria-invalid={isInvalid} id={field.name} onBlur={field.handleBlur}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" className="max-h-50">
          {children}
        </SelectContent>
      </Select>
    </FieldBase>
  );
}
