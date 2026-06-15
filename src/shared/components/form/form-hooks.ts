import { createFormHook, createFormHookContexts } from '@tanstack/react-form';
import { FieldCheckbox } from './fields/field-checkbox';
import { FieldInput } from './fields/field-input';
import { FieldLocation } from './fields/field-location';
import { FieldPhoto } from './fields/field-photo';
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
    Photo: FieldPhoto,
  },
  formComponents: {
    ButtonSubmit: FormSubmit,
    Form: FormWrapper,
  },
  fieldContext,
  formContext,
});

export { useAppForm, useFieldContext, useFormContext };
