import {getApiErrorMessage} from '@common/http/errors/parsed-api-error';

export function productSaveErrorMessage(
  reason: unknown,
  savedAndSubmitFailed: boolean,
  submissionUncertain = false,
): string {
  if (savedAndSubmitFailed) {
    return submissionUncertain
      ? 'Draft saved, but we could not confirm submission. Check My Items before submitting again.'
      : 'Draft saved, but submission failed. Fix the issue and try again.';
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
