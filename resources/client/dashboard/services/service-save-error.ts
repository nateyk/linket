import {
  getApiErrorMessage,
  parseApiError,
} from '@common/http/errors/parsed-api-error';

function visibleServiceField(field: string): string {
  if (field.startsWith('skills.')) return 'skills';
  if (
    field === 'gallery_file_entry_ids' ||
    field.startsWith('gallery_file_entry_ids.')
  ) {
    return 'gallery';
  }

  const packageFeature = field.match(/^(packages\.\d+\.features)\.\d+$/);
  return packageFeature?.[1] ?? field;
}

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
      const formField = visibleServiceField(field);
      fieldErrors[formField] ??= first;
    }
  }

  return {
    message: parsed.message,
    fieldErrors,
  };
}
