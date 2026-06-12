import { createFormHook, createFormHookContexts } from '@tanstack/react-form';
import { FieldCheckbox } from './fields/field-checkbox';
import { FieldInput } from './fields/field-input';
import { FieldLocation } from './fields/field-location';
import { FieldSelect } from './fields/field-select';
import { FieldTextarea } from './fields/field-textarea';
import { FormSubmit } from './form-submit';
import { FormWrapper } from './form-wrapper';

const { fieldContext, formContext, useFieldContext, useFormContext } = createFormHookContexts();

const { useAppForm } = createFormHook({
  fieldComponents: {
    Input: FieldInput,
    Textarea: FieldTextarea,
    Select: FieldSelect,
    Checkbox: FieldCheckbox,
    Location: FieldLocation,
  },
  formComponents: {
    ButtonSubmit: FormSubmit,
    Form: FormWrapper,
  },
  fieldContext,
  formContext,
});

export { useAppForm, useFieldContext, useFormContext };
