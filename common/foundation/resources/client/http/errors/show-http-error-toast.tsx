import {
  PolicyFailAction,
  PolicyFailMessage,
  PolicyFailReason,
} from '@common/billing/upgrade/policy-fail-message';
import {toast} from '@shadcn/toast/toast';
import {MessageDescriptor} from '@ui/i18n/message-descriptor';
import {Trans} from '@ui/i18n/trans';
import {SecondParam} from '@ui/utils/ts/extract-params';
import {ReactElement} from 'react';
import {getApiErrorMessage, parseApiError} from './parsed-api-error';

const defaultErrorMessage = (
  <Trans message="There was an issue. Please try again." />
);

export function showHttpErrorToast(
  err: unknown,
  defaultMessage: ReactElement | MessageDescriptor | string = defaultErrorMessage,
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
    default: {
      const message = getApiErrorMessage(err, field) || defaultMessage;
      const content =
        typeof message === 'object' && message !== null && 'message' in message
          ? <Trans {...message} />
          : message;
      toast.error(content, toastOptions);
    }
  }
}
