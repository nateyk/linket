import {
  PolicyFailAction,
  PolicyFailMessage,
  PolicyFailReason,
} from '@common/billing/upgrade/policy-fail-message';
import {toast} from '@shadcn/toast/toast';
import {Trans} from '@ui/i18n/trans';
import {SecondParam} from '@ui/utils/ts/extract-params';
import {getApiErrorMessage, parseApiError} from './parsed-api-error';

const defaultErrorMessage = (
  <Trans message="There was an issue. Please try again." />
);

export function showHttpErrorToast(
  err: unknown,
  defaultMessage = defaultErrorMessage,
  field?: string | null,
  toastOptions?: SecondParam<typeof toast.error>,
) {
  const parsedError = parseApiError(err);
  switch (parsedError.type) {
    case 'policyFail': {
      const policyFailData = parsedError.data as {
        resources: string;
        reason: PolicyFailReason;
        action: PolicyFailAction;
      };
      toast.error(
        <PolicyFailMessage
          resourcesName={policyFailData.resources}
          reason={policyFailData.reason}
          action={policyFailData.action}
        />,
      );
      break;
    }
    default:
      toast.error(
        getApiErrorMessage(err, field) || defaultMessage,
        toastOptions,
      );
  }
}
