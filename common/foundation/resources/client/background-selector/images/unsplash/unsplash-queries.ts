import type {ListUnsplashImagesParams} from '@app/gen/schemas/list-unsplash-images-params';
import {listUnsplashImages, trackUnsplashDownload} from '@app/gen/unsplash';
import {mutationOptions, queryOptions} from '@tanstack/react-query';

export const unsplashImagesBaseKey = ['unsplash-images'];

export const listUnsplashImagesOptions = (
  params: ListUnsplashImagesParams = {},
) => {
  return queryOptions({
    queryKey: [...unsplashImagesBaseKey, params],
    queryFn: () => listUnsplashImages(params),
  });
};

export const trackUnsplashDownloadOptions = () => {
  return mutationOptions({
    mutationFn: (id: string) => trackUnsplashDownload(id),
  });
};
