import {isAxiosError} from 'axios';

/**
 * Treat a mutation outcome as unknown unless the server explicitly rejected
 * it with a 4xx response. A 5xx may follow a committed create/submit and
 * must not invite an automatic duplicate POST.
 */
export function isUncertainMutationOutcome(reason: unknown): boolean {
  const status = isAxiosError(reason) ? reason.response?.status : undefined;
  return status == null || status < 400 || status >= 500;
}
