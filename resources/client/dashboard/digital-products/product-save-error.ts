import {getApiErrorMessage} from '@common/http/errors/parsed-api-error';

export function productSaveErrorMessage(
  reason: unknown,
  savedAndSubmitFailed: boolean,
): string {
  if (savedAndSubmitFailed) {
    return 'Draft saved, but submission failed. Fix the issue and try again.';
  }

  const apiMessage = getApiErrorMessage(reason);
  if (apiMessage !== 'An error occurred.') {
    return apiMessage;
  }

  if (reason instanceof Error && reason.message) {
    return reason.message;
  }

  return 'Unable to save product.';
}
