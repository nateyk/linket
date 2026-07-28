import {FileEntry} from '@app/gen/schemas/file-entry';
import {createContext} from 'react';

export interface FilePreviewContextValue {
  entries: FileEntry[];
  activeIndex: number;
}

export const FilePreviewContext = createContext<FilePreviewContextValue>(null!);
