import {
  getApiErrorMessage,
  parseApiError,
} from '@common/http/errors/parsed-api-error';

export function serviceSaveErrorMessage(reason: unknown): string {
  const apiMessage = getApiErrorMessage(reason);

  if (apiMessage !== 'An error occurred.') {
    return apiMessage;
  }

  return 'Unable to save service.';
}

export function parseServiceErrors(reason: unknown): {
  message: string;
  fieldErrors: Record<string, string>;
} {
  const parsed = parseApiError(reason);
  const fieldErrors: Record<string, string> = {};

  for (const [field, errors] of Object.entries(parsed.errors)) {
    const first = Array.isArray(errors) ? errors[0] : errors;
    if (first) {
      fieldErrors[field] = first;
    }
  }

  return {
    message: parsed.message,
    fieldErrors,
  };
}
