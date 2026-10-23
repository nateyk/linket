import {apiClient} from '@common/http/query-client';
import {getApiErrorMessage} from '@common/http/errors/parsed-api-error';
import {message} from '@ui/i18n/message';
import {toast} from '@ui/toast/toast';
import type {PackDetailDownload, PackDetailOrder} from './portal-pack-order';

export async function portalCsrfHeaders(): Promise<Record<string, string>> {
  await fetch('/sanctum/csrf-cookie', {credentials: 'same-origin'});
  const token = document.cookie
    .split('; ')
    .find(value => value.startsWith('XSRF-TOKEN='))
    ?.split('=')[1];
  const headers: Record<string, string> = {Accept: 'application/json'};
  if (token) {
    headers['X-XSRF-TOKEN'] = decodeURIComponent(token);
  }
  return headers;
}

export async function requestPackDownloadUrl(
  order: PackDetailOrder,
  entitlement: PackDetailDownload,
): Promise<string | null> {
  if (order.is_demo) {
    toast(message('Sample download — real files appear after purchase.'));
    return null;
  }
  const headers = await portalCsrfHeaders();
  const response = await apiClient.post(
    `/api/v1/public/my-portal/purchases/${order.id}/downloads/${entitlement.id}`,
    {},
    {headers},
  );
  const payload = response.data;
  if (!payload?.url) {
    throw new Error(
      payload?.message || 'This protected download is no longer available.',
    );
  }
  return payload.url as string;
}

export async function downloadPackFile(
  order: PackDetailOrder,
  entitlement: PackDetailDownload,
): Promise<void> {
  try {
    const url = await requestPackDownloadUrl(order, entitlement);
    if (url) {
      window.location.assign(url);
    }
  } catch (reason) {
    const apiMessage = getApiErrorMessage(reason);
    toast.danger(
      apiMessage !== 'An error occurred.'
        ? apiMessage
        : reason instanceof Error
          ? reason.message
          : 'Unable to prepare your download.',
    );
  }
}

export async function resendPackReceipt(order: PackDetailOrder): Promise<void> {
  if (order.is_demo) {
    toast(message('Sample receipt — real receipts appear after purchase.'));
    return;
  }
  try {
    const headers = await portalCsrfHeaders();
    const response = await apiClient.post(
      `/api/v1/public/my-portal/purchases/${order.id}/resend-receipt`,
      {},
      {headers},
    );
    if (!response.data && response.status >= 400) {
      throw new Error('Unable to resend the receipt.');
    }
    toast(message('Your receipt is being sent.'));
  } catch (reason) {
    const apiMessage = getApiErrorMessage(reason);
    toast.danger(
      apiMessage !== 'An error occurred.'
        ? apiMessage
        : reason instanceof Error
          ? reason.message
          : 'Unable to resend the receipt.',
    );
  }
}
