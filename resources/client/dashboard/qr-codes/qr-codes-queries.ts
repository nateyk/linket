import {biolinksBaseKey} from '@app/dashboard/stores/stores-queries';
import {foldersBaseKey} from '@app/dashboard/folders/folders-queries';
import {linksBaseKey} from '@app/dashboard/links/links-queries';
import {DatatableRouteType} from '@app/dashboard/use-datatable-route-type';
import {
  archiveQrCodes,
  createQrCode,
  deleteQrCodes,
  exportQrCodesCsv,
  listQrCodes,
  retrieveQrCode,
  unarchiveQrCodes,
  updateQrCode,
} from '@app/gen/qr-codes';
import {queryClient} from '@common/http/query-client';
import {mutationOptions, queryOptions} from '@tanstack/react-query';
import {FirstParam, SecondParam} from '@ui/utils/ts/extract-params';

export const qrCodesBaseKey = ['qr-codes'];

export const listQrCodesOptions = (
  routeType: DatatableRouteType,
  search: FirstParam<typeof listQrCodes>,
) => {
  const params = search ?? {};
  if (routeType === 'admin') {
    params.workspace_id = 'all';
  }
  return queryOptions({
    queryKey: [...qrCodesBaseKey, params],
    queryFn: () => listQrCodes(params),
  });
};

export const retrieveQrCodeOptions = (id: number) => {
  return queryOptions({
    queryKey: [...qrCodesBaseKey, `${id}`],
    queryFn: () => retrieveQrCode(id),
  });
};

export const createQrCodeOptions = () => {
  return mutationOptions({
    mutationFn: (body: FirstParam<typeof createQrCode>) => createQrCode(body),
    onSuccess: () => invalidateQrCodeQueries(),
  });
};

export const updateQrCodeOptions = (
  qrCodeId: FirstParam<typeof updateQrCode>,
) => {
  return mutationOptions({
    mutationFn: (body: SecondParam<typeof updateQrCode>) =>
      updateQrCode(qrCodeId, body),
    onSuccess: () => invalidateQrCodeQueries(),
  });
};

export const deleteQrCodesOptions = () =>
  mutationOptions({
    mutationFn: (qrCodeIds: (number | string)[]) =>
      deleteQrCodes({ids: qrCodeIds.join(',')}),
    onSuccess: () => invalidateQrCodeQueries(),
  });

export const archiveQrCodesOptions = () =>
  mutationOptions({
    mutationFn: (qrCodeIds: (number | string)[]) =>
      archiveQrCodes({ids: qrCodeIds.join(',')}),
    onSuccess: () => invalidateQrCodeQueries(),
  });

export const unarchiveQrCodesOptions = () =>
  mutationOptions({
    mutationFn: (qrCodeIds: (number | string)[]) =>
      unarchiveQrCodes({ids: qrCodeIds.join(',')}),
    onSuccess: () => invalidateQrCodeQueries(),
  });

export const exportQrCodesCsvOptions = (
  payload: FirstParam<typeof exportQrCodesCsv>,
) => {
  return mutationOptions({
    mutationFn: () => exportQrCodesCsv(payload),
  });
};

const invalidateQrCodeQueries = () => {
  return Promise.allSettled([
    queryClient.invalidateQueries({
      queryKey: qrCodesBaseKey,
    }),
    queryClient.invalidateQueries({
      queryKey: linksBaseKey,
    }),
    queryClient.invalidateQueries({
      queryKey: foldersBaseKey,
    }),
    queryClient.invalidateQueries({
      queryKey: biolinksBaseKey,
    }),
  ]);
};
