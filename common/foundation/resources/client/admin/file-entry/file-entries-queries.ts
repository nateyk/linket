import {
  bulkDeleteFileEntries,
  listFileEntries,
  retrieveFileEntryModel,
} from '@app/gen/files';
import {ListFileEntriesParams} from '@app/gen/schemas/list-file-entries-params';
import {queryClient} from '@common/http/query-client';
import {mutationOptions, queryOptions} from '@tanstack/react-query';

export const fileEntriesBaseKey = ['file-entries'];

export const listFileEntriesOptions = (params: ListFileEntriesParams) =>
  queryOptions({
    queryKey: [...fileEntriesBaseKey, params],
    queryFn: () => listFileEntries(params),
  });

export const retrieveFileEntryModelOptions = (entryId: number) =>
  queryOptions({
    queryKey: [...fileEntriesBaseKey, entryId, 'model'],
    queryFn: () => retrieveFileEntryModel(entryId),
  });

export const deleteFileEntriesOptions = mutationOptions({
  mutationFn: (entryIds: number[]) => bulkDeleteFileEntries({entryIds}),
  onSuccess: () => {
    queryClient.invalidateQueries({
      queryKey: fileEntriesBaseKey,
    });
  },
});
