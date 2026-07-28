import axios, {AxiosError} from 'axios';

export type ParsedApiError<T = unknown> = {
  status: number;
  message: string;
  errors: Record<string, string | string[]>;
  type: 'policyFail' | 'error';
  data: T;
};

const defaultErrorMessage = 'An error occurred.';

export function parseApiError(err: unknown): ParsedApiError {
  if (axios.isAxiosError(err) && err.response) {
    return {
      status: err.response.status,
      message: err.response.data.message ?? defaultErrorMessage,
      errors: err.response.data.errors ?? {},
      type: err.response.data.type ?? 'error',
      data: err.response.data,
    };
  }

  return {
    status: (err as any)?.status ?? 500,
    message: defaultErrorMessage,
    errors: {},
    type: 'error',
    data: null,
  };
}

export function getApiErrorMessage(
  err: unknown,
  field?: string | null,
): string {
  const parsedError = parseApiError(err);

  if (!parsedError) {
    return defaultErrorMessage;
  }

  if (field != null) {
    const fieldMessage = parsedError.errors[field];

    if (fieldMessage) {
      if (Array.isArray(fieldMessage)) {
        if (fieldMessage[0]) {
          return fieldMessage[0];
        }
      } else {
        return fieldMessage;
      }
    }
  }

  return parsedError.message;
}

export function apiErrorStatusIs(err: unknown, status: number): boolean {
  return parseApiError(err).status === status;
}

export function throwAxiosError(message?: string) {
  message =
    message || 'An error occured. Please check your connection and try again.';
  throw new AxiosError(message, undefined, undefined, undefined, {
    data: {message},
  } as any);
}
