import {
  createLocalization,
  deleteLocalization,
  listLocalizations,
  retrieveLocalization,
  updateLocalization,
  uploadLocalization,
} from '@app/gen/localizations';
import {queryClient} from '@common/http/query-client';
import {mutationOptions, queryOptions} from '@tanstack/react-query';
import {FirstParam, SecondParam} from '@ui/utils/ts/extract-params';

export const localizationsBaseKey = ['localizations'];

export const listLocalizationsOptions = () => {
  return queryOptions({
    queryKey: localizationsBaseKey,
    queryFn: () => listLocalizations(),
  });
};

export const retrieveLocalizationOptions = (id: number) => {
  return queryOptions({
    queryKey: [...localizationsBaseKey, `${id}`],
    queryFn: () => retrieveLocalization(id),
  });
};

export const createLocalizationOptions = () => {
  return mutationOptions({
    mutationFn: (body: FirstParam<typeof createLocalization>) =>
      createLocalization(body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: localizationsBaseKey,
      });
    },
  });
};

export const updateLocalizationOptions = (localizationId: number) => {
  return mutationOptions({
    mutationFn: (body: SecondParam<typeof updateLocalization>) =>
      updateLocalization(localizationId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: localizationsBaseKey,
      });
    },
  });
};

export const deleteLocalizationsOptions = mutationOptions({
  mutationFn: (id: number) => deleteLocalization(id),
  onSuccess: () => {
    queryClient.invalidateQueries({
      queryKey: localizationsBaseKey,
    });
  },
});

export const uploadLocalizationOptions = (localizationId: number) => {
  return mutationOptions({
    mutationFn: (body: SecondParam<typeof uploadLocalization>) =>
      uploadLocalization(localizationId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: localizationsBaseKey,
      });
    },
  });
};
