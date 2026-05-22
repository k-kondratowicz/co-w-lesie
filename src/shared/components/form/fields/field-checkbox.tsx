import { Checkbox } from '../../ui/checkbox';
import { useFieldContext } from '../form-hooks';
import { FieldBase, type FieldControlProps } from './field-base';

export function FieldCheckbox(props: FieldControlProps) {
  const field = useFieldContext<boolean>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <FieldBase {...props} controlFirst horizontal>
      <Checkbox
        id={field.name}
        name={field.name}
        checked={field.state.value}
        onBlur={field.handleBlur}
        onCheckedChange={(e) => field.handleChange(e === true)}
        aria-invalid={isInvalid}
      />
    </FieldBase>
  );
}
