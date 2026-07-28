import {FileEntry} from '@app/gen/schemas/file-entry';

export interface FilePreviewProps {
  entry: FileEntry;
  className?: string;
  allowDownload?: boolean;
}
