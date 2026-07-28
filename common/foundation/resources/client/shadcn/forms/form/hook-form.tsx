import {Field} from '@shadcn/forms/field';
import {Form} from '@shadcn/forms/form/form';
import {ComponentProps, createContext, ReactNode} from 'react';
import {
  ControllerRenderProps,
  FieldValues,
  FormProvider,
  SubmitHandler,
  useController,
  UseFormReturn,
} from 'react-hook-form';

type Props<T extends FieldValues> = {
  children?: ReactNode;
  form: UseFormReturn<T>;
  className?: string;
  onSubmit: SubmitHandler<T>;
  id?: string;
  errors?: Record<string, string>;
};

/**
 * A react-hook-form backed form with consolidated error handling.
 */
function HookFormRoot<T extends FieldValues>({
  children,
  onSubmit,
  form,
  className,
  id,
  errors,
}: Props<T>) {
  return (
    <FormProvider {...form}>
      <Form
        // this is needed so parent form doesn't submit, if nested. "onSubmit" on main Form component from baseui will never be called if form has errors, so propagation will not be stopped.
        render={<form onSubmit={e => e.stopPropagation()} />}
        id={id}
        errors={errors}
        className={className}
        onSubmit={e => {
          e.stopPropagation();
          e.preventDefault();
          form.handleSubmit(onSubmit)(e);
        }}
      >
        {children}
      </Form>
    </FormProvider>
  );
}

const HookFieldContext = createContext<
  | (Pick<
      ControllerRenderProps,
      'onChange' | 'onBlur' | 'value' | 'ref' | 'disabled'
    > & {
      error?: string;
    })
  | undefined
>(undefined);

/**
 * A react-hook-form controlled field that provides hook form context to form controls.
 */
function HookFormField({
  name,
  invalid,
  dirty,
  touched,
  disabled,
  ...props
}: Omit<ComponentProps<typeof Field.Root>, 'name'> & {name: string}) {
  const {field, fieldState} = useController({
    name,
  });
  return (
    <HookFieldContext.Provider
      value={{
        onChange: field.onChange,
        onBlur: field.onBlur,
        value: field.value,
        ref: field.ref,
        disabled: field.disabled,
        error: fieldState.error?.message,
      }}
    >
      <Field.Root
        name={name}
        invalid={invalid ?? fieldState.invalid}
        dirty={dirty ?? fieldState.isDirty}
        touched={touched ?? fieldState.isTouched}
        disabled={disabled ?? field.disabled}
        {...props}
      />
    </HookFieldContext.Provider>
  );
}

export const HookForm = {
  Root: HookFormRoot,
  Field: HookFormField,
  FieldContext: HookFieldContext,
};
