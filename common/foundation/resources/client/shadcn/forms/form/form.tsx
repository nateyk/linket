import {Form as FormPrimitive} from '@base-ui/react/form';

/**
 * A native form element with consolidated error handling.
 */
export function Form(props: FormPrimitive.Props) {
  return <FormPrimitive {...props} />;
}
