import {
  parseApiError,
  ParsedApiError,
} from '@common/http/errors/parsed-api-error';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {toast} from '@shadcn/toast/toast';
import {UseFormReturn} from 'react-hook-form';

export function onFormQueryError(
  r: unknown,
  form: UseFormReturn<any>,
  fieldsToShowInToast: string[] = [],
  onlyAddErrorToRegisteredFields = false,
) {
  const handleError = (key: string, message: string, shouldFocus: boolean) => {
    if (
      fieldsToShowInToast[0] === '*' ||
      fieldsToShowInToast.includes(key) ||
      key === 'captcha_token' ||
      // if this key is not registered in the form, show toast instead
      (onlyAddErrorToRegisteredFields && !(key in form.getValues()))
    ) {
      toast.error(message);
    } else {
      form.setError(key, {message}, {shouldFocus});
    }
  };

  const parsedError = parseApiError(r);

  if (errorsAreEmpty(parsedError.errors)) {
    showHttpErrorToast(r);
  } else {
    Object.entries(parsedError.errors).forEach(([key, errors], index) => {
      if (typeof errors === 'string') {
        handleError(key, errors, index === 0);
      } else {
        errors.forEach((message, subIndex) => {
          handleError(key, message, index === 0 && subIndex === 0);
        });
      }
    });
  }
}

function errorsAreEmpty(errors: ParsedApiError['errors']): boolean {
  return (
    !errors ||
    (Array.isArray(errors) && errors.length === 0) ||
    Object.keys(errors).length === 0
  );
}
