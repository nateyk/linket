import {
  createCustomPage,
  deleteCustomPage,
  listCustomPages,
  retrieveCustomPage,
  updateCustomPage,
} from '@app/gen/custom-pages';
import {queryClient} from '@common/http/query-client';
import {mutationOptions, queryOptions} from '@tanstack/react-query';
import {FirstParam, SecondParam} from '@ui/utils/ts/extract-params';

export const customPagesBaseKey = ['custom-pages'];

export const listCustomPagesOptions = () => {
  return queryOptions({
    queryKey: customPagesBaseKey,
    queryFn: () => listCustomPages(),
  });
};

export const retrieveCustomPageOptions = (id: number | string) => {
  return queryOptions({
    queryKey: [...customPagesBaseKey, `${id}`],
    queryFn: () => retrieveCustomPage(id),
  });
};

export const createCustomPageOptions = () => {
  return mutationOptions({
    mutationFn: (body: FirstParam<typeof createCustomPage>) =>
      createCustomPage(body),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: customPagesBaseKey});
    },
  });
};

export const updateCustomPageOptions = (id: number) => {
  return mutationOptions({
    mutationFn: (body: SecondParam<typeof updateCustomPage>) =>
      updateCustomPage(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: customPagesBaseKey});
    },
  });
};

export const deleteCustomPageOptions = () => {
  return mutationOptions({
    mutationFn: (id: number) => deleteCustomPage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: customPagesBaseKey});
    },
  });
};
