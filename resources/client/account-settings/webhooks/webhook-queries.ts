import {
  createWebhook,
  deleteWebhook,
  disableWebhook,
  enableWebhook,
  listWebhookAttempts,
  listWebhooks,
  retrieveWebhook,
  retrieveWebhookAttempt,
  sendTestWebhookEvent,
  updateWebhook,
} from '@app/gen/webhooks';
import {queryClient} from '@common/http/query-client';
import {mutationOptions, queryOptions} from '@tanstack/react-query';
import {removeEmptyValuesFromObject} from '@ui/utils/objects/remove-empty-values-from-object';
import {FirstParam, SecondParam} from '@ui/utils/ts/extract-params';

export const webhooksBaseKey = ['webhooks'];

export const webhookAttemptsBaseKey = (webhookId: string | number) => [
  ...webhooksBaseKey,
  `${webhookId}`,
  'attempts',
];

export const listWebhooksOptions = (
  search?: FirstParam<typeof listWebhooks>,
) => {
  const params = removeEmptyValuesFromObject({...search});
  return queryOptions({
    queryKey: [...webhooksBaseKey, params],
    queryFn: () => listWebhooks(params),
  });
};

export const retrieveWebhookOptions = (
  webhookId: FirstParam<typeof retrieveWebhook>,
) => {
  return queryOptions({
    queryKey: [...webhooksBaseKey, `${webhookId}`],
    queryFn: () => retrieveWebhook(webhookId),
  });
};

export const createWebhookOptions = () => {
  return mutationOptions({
    mutationFn: (body: FirstParam<typeof createWebhook>) => createWebhook(body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: webhooksBaseKey,
      });
    },
  });
};

export const updateWebhookOptions = (
  webhookId: FirstParam<typeof updateWebhook>,
) => {
  return mutationOptions({
    mutationFn: (body: SecondParam<typeof updateWebhook>) =>
      updateWebhook(webhookId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: webhooksBaseKey,
      });
    },
  });
};

export const deleteWebhookOptions = () => {
  return mutationOptions({
    mutationFn: (webhookId: FirstParam<typeof deleteWebhook>) =>
      deleteWebhook(webhookId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: webhooksBaseKey,
      });
    },
  });
};

export const enableWebhookOptions = () => {
  return mutationOptions({
    mutationFn: (webhookId: FirstParam<typeof enableWebhook>) =>
      enableWebhook(webhookId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: webhooksBaseKey,
      });
    },
  });
};

export const disableWebhookOptions = () => {
  return mutationOptions({
    mutationFn: (webhookId: FirstParam<typeof disableWebhook>) =>
      disableWebhook(webhookId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: webhooksBaseKey,
      });
    },
  });
};

export const sendTestWebhookEventOptions = (
  webhookId: FirstParam<typeof sendTestWebhookEvent>,
) => {
  return mutationOptions({
    mutationFn: (body: SecondParam<typeof sendTestWebhookEvent>) =>
      sendTestWebhookEvent(webhookId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: webhookAttemptsBaseKey(webhookId),
      });
    },
  });
};

export const listWebhookAttemptsOptions = (
  webhookId: FirstParam<typeof listWebhookAttempts>,
  search?: SecondParam<typeof listWebhookAttempts>,
) => {
  const params = removeEmptyValuesFromObject({...search});
  if (params.page === 1) {
    delete params.page;
  }
  return queryOptions({
    queryKey: [...webhookAttemptsBaseKey(webhookId), params],
    queryFn: () => listWebhookAttempts(webhookId, params),
  });
};

export const retrieveWebhookAttemptOptions = (
  webhookId: FirstParam<typeof retrieveWebhookAttempt>,
  attemptId: SecondParam<typeof retrieveWebhookAttempt>,
) => {
  return queryOptions({
    queryKey: [...webhookAttemptsBaseKey(webhookId), `${attemptId}`],
    queryFn: () => retrieveWebhookAttempt(webhookId, attemptId),
  });
};
