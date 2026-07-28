import {
  cancelSubscription,
  changeSubscriptionPlan,
  createSubscription,
  listSubscriptions,
  resumeSubscription,
  updateSubscription,
} from '@app/gen/subscriptions';
import {queryClient} from '@common/http/query-client';
import {mutationOptions, queryOptions} from '@tanstack/react-query';
import {FirstParam, SecondParam} from '@ui/utils/ts/extract-params';

export const subscriptionsBaseKey = ['subscriptions'];

export const listSubscriptionsOptions = (
  params: Record<string, string | string[]> = {},
) => {
  return queryOptions({
    queryKey: [...subscriptionsBaseKey, params],
    queryFn: () => listSubscriptions(params),
  });
};

export const createSubscriptionOptions = () => {
  return mutationOptions({
    mutationFn: (body: FirstParam<typeof createSubscription>) =>
      createSubscription(body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: subscriptionsBaseKey,
      });
    },
  });
};

export const updateSubscriptionOptions = (subscriptionId: number) => {
  return mutationOptions({
    mutationFn: (body: SecondParam<typeof updateSubscription>) =>
      updateSubscription(subscriptionId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: subscriptionsBaseKey,
      });
    },
  });
};

export const cancelSubscriptionOptions = () => {
  return mutationOptions({
    mutationFn: (payload: {
      subscriptionId: number;
      deleteSubscription?: boolean;
    }) =>
      cancelSubscription(payload.subscriptionId, {
        deleteSubscription: payload.deleteSubscription,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: subscriptionsBaseKey,
      });
    },
  });
};

export const resumeSubscriptionOptions = () => {
  return mutationOptions({
    mutationFn: (subscriptionId: number) => resumeSubscription(subscriptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: subscriptionsBaseKey,
      });
    },
  });
};

export const changeSubscriptionPlanOptions = () => {
  return mutationOptions({
    mutationFn: (payload: {
      subscriptionId: number;
      newProductId: number;
      newPriceId: number;
    }) =>
      changeSubscriptionPlan(payload.subscriptionId, {
        newProductId: payload.newProductId,
        newPriceId: payload.newPriceId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: subscriptionsBaseKey,
      });
    },
  });
};
