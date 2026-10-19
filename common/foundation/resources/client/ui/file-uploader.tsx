import {UploadType} from '@app/site-config';
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from '@shadcn/attachment/attachment';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Spinner} from '@shadcn/spinner/spinner';
import {Trans} from '@ui/i18n/trans';
import {toast} from '@ui/toast/toast';
import {cn} from '@ui/utils/cn';
import {FileUploadContext} from '@common/uploads/uploader/file-upload-provider';
import {restrictionsFromConfig} from '@common/uploads/uploader/create-file-upload';
import type {FileEntry} from '@app/gen/schemas/file-entry';
import {
  CheckIcon,
  TriangleAlertIcon,
  UploadIcon,
  XIcon,
} from 'lucide-react';
import {
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export type UploadItemStatus = 'uploading' | 'done' | 'error';

export interface UploadItem {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: UploadItemStatus;
  error?: string;
}

export interface UploadRestrictions {
  allowedFileTypes?: string[];
  maxFileSize?: number;
}

interface SimpleFile {
  name: string;
  size: number;
  type: string;
}

export function formatUploadSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function normalizeType(type: string): string {
  return type.trim().toLowerCase();
}

function fileMatchesAccept(
  file: SimpleFile,
  allowedFileTypes: string[],
): boolean {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  const mime = file.type.toLowerCase();
  return allowedFileTypes
    .map(t => t.split(','))
    .flat()
    .map(normalizeType)
    .some(type => {
      if (!type) return false;
      if (type.includes('/')) {
        if (type.endsWith('/*')) {
          return mime.startsWith(type.slice(0, -1));
        }
        return mime === type;
      }
      const clean = type.replace(/^\./, '');
      return extension === clean;
    });
}

export function validateUploadFile(
  file: SimpleFile,
  restrictions?: UploadRestrictions | null,
): string | undefined {
  if (!restrictions) return undefined;
  const {allowedFileTypes, maxFileSize} = restrictions;
  if (maxFileSize && file.size > maxFileSize) {
    return `File exceeds ${formatUploadSize(maxFileSize)} limit`;
  }
  if (allowedFileTypes?.length) {
    if (!fileMatchesAccept(file, allowedFileTypes)) {
      return 'Unsupported file type';
    }
  }
  return undefined;
}

export function clearUploadItem(
  items: UploadItem[],
  id: string,
): UploadItem[] {
  return items.filter(item => item.id !== id);
}

export function applyUploadProgress(
  items: UploadItem[],
  id: string,
  progress: number,
): UploadItem[] {
  return items.map(item =>
    item.id === id
      ? {...item, progress: Math.min(100, Math.round(progress))}
      : item,
  );
}

export function applyUploadError(
  items: UploadItem[],
  id: string,
  message: string,
): UploadItem[] {
  return items.map(item =>
    item.id === id ? {...item, status: 'error' as const, error: message} : item,
  );
}

function restrictionsFor(
  uploadType: keyof typeof UploadType,
  overrides?: UploadRestrictions,
): UploadRestrictions | null {
  if (overrides) return overrides;
  try {
    return restrictionsFromConfig({uploadType}) as UploadRestrictions | null;
  } catch {
    return null;
  }
}

function acceptAttr(
  uploadType: keyof typeof UploadType,
  acceptProp?: string,
): string | undefined {
  if (acceptProp) return acceptProp;
  try {
    const restrictions = restrictionsFromConfig({uploadType});
    return restrictions?.allowedFileTypes?.join(',');
  } catch {
    return undefined;
  }
}

interface SharedFileUploaderProps {
  uploadType: keyof typeof UploadType;
  onUploaded: (entry: FileEntry) => void;
  accept?: string;
  maxSize?: number;
  maxFiles?: number;
  multiple?: boolean;
  title?: ReactNode;
  description?: ReactNode;
  hint?: ReactNode;
  initialItems?: UploadItem[];
  className?: string;
  bare?: boolean;
  /**
   * One compact row instead of the full drop zone. Same input, same drag and
   * drop, same validation — for a picker that sits beside content instead of
   * above it, like an image gallery next to an existing cover.
   */
  compact?: boolean;
  /** Accessible name for the compact trigger; defaults to "Add images". */
  ariaLabel?: string;
}

export function SharedFileUploader({
  uploadType,
  onUploaded,
  accept,
  maxSize,
  maxFiles,
  multiple = true,
  title,
  description,
  hint,
  initialItems = [],
  className,
  bare = false,
  compact = false,
  ariaLabel,
}: SharedFileUploaderProps) {
  const [items, setItems] = useState<UploadItem[]>(initialItems);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const uploadStore = useContext(FileUploadContext);
  const idToUploadId = useRef(new Map<string, string>());
  const onUploadedRef = useRef(onUploaded);
  onUploadedRef.current = onUploaded;

  const markDone = useCallback(
    (id: string, entry: FileEntry) => {
      toast.positive(`${entry.name} uploaded`);
      void (async () => {
        try {
          await onUploadedRef.current(entry);
        } finally {
          // The parent attached-files list owns finished files, so drop the
          // internal row — each file shows exactly once.
          const uploadId = idToUploadId.current.get(id);
          if (uploadId && uploadStore) {
            try {
              uploadStore.getState().removeUpload(uploadId);
            } catch {
              // ignore store errors on remove
            }
          }
          idToUploadId.current.delete(id);
          setItems(prev => clearUploadItem(prev, id));
        }
      })();
    },
    [uploadStore],
  );

  const markError = useCallback((id: string, message: string) => {
    setItems(prev => applyUploadError(prev, id, message));
  }, []);

  const markProgress = useCallback((id: string, progress: number) => {
    setItems(prev => applyUploadProgress(prev, id, progress));
  }, []);

  const addFiles = useCallback(
    (fileList: FileList | File[] | null) => {
      if (!fileList) return;
      const incoming = Array.from(fileList);
      if (!incoming.length) return;

      const restrictions = restrictionsFor(uploadType, {
        allowedFileTypes: accept
          ? accept.split(',').map(s => s.trim())
          : restrictionsFor(uploadType)?.allowedFileTypes,
        maxFileSize:
          maxSize ?? restrictionsFor(uploadType)?.maxFileSize,
      });

      const remaining =
        maxFiles != null ? Math.max(0, maxFiles - items.length) : incoming.length;
      const accepted = maxFiles != null ? incoming.slice(0, remaining) : incoming;
      const rejected = maxFiles != null ? incoming.slice(remaining) : [];

      for (const file of rejected) {
        toast.danger(`"${file.name}" rejected: maximum ${maxFiles} files allowed`);
      }

      const next: UploadItem[] = accepted.map(file => {
        const error = validateUploadFile(
          {name: file.name, size: file.size, type: file.type},
          restrictions,
        );
        if (error) {
          toast.danger(error);
        }
        return {
          id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
          name: file.name,
          size: file.size,
          progress: 0,
          status: (error ? 'error' : 'uploading') as UploadItemStatus,
          error,
        };
      });
      setItems(prev => [...next, ...prev]);

      if (!uploadStore) return;

      for (let i = 0; i < accepted.length; i++) {
        const file = accepted[i];
        const item = next[i];
        if (item.status === 'error') continue;
        try {
          const uploadId = uploadStore.getState().uploadSingle(file, {
            uploadType,
            showToastOnRestrictionFail: true,
            showToastOnBackendError: true,
            onProgress: ({bytesUploaded, bytesTotal}) => {
              if (bytesTotal > 0) {
                markProgress(item.id, (bytesUploaded / bytesTotal) * 100);
              }
            },
            onSuccess: entry => {
              markDone(item.id, entry);
            },
            onError: message => {
              markError(
                item.id,
                typeof message === 'string' && message
                  ? message
                  : 'Upload failed',
              );
            },
          });
          idToUploadId.current.set(item.id, uploadId);
        } catch {
          markError(item.id, 'Upload failed');
        }
      }
    },
    [
      accept,
      items.length,
      markDone,
      markError,
      markProgress,
      maxFiles,
      maxSize,
      uploadStore,
      uploadType,
    ],
  );

  const removeItem = useCallback(
    (id: string) => {
      const uploadId = idToUploadId.current.get(id);
      if (uploadId && uploadStore) {
        try {
          uploadStore.getState().abortUpload(uploadId);
          uploadStore.getState().removeUpload(uploadId);
        } catch {
          // ignore store errors on remove
        }
        idToUploadId.current.delete(id);
      }
      setItems(prev => prev.filter(item => item.id !== id));
    },
    [uploadStore],
  );

  // Both the full drop zone and the compact row are drop targets, so the
  // handlers live in one place rather than being written twice.
  const dropHandlers = {
    onDragOver: (event: React.DragEvent) => {
      event.preventDefault();
    },
    onDragEnter: (event: React.DragEvent) => {
      event.preventDefault();
      dragDepth.current += 1;
      setIsDragging(true);
    },
    onDragLeave: (event: React.DragEvent) => {
      event.preventDefault();
      dragDepth.current -= 1;
      if (dragDepth.current <= 0) {
        dragDepth.current = 0;
        setIsDragging(false);
      }
    },
    onDrop: (event: React.DragEvent) => {
      event.preventDefault();
      dragDepth.current = 0;
      setIsDragging(false);
      addFiles(event.dataTransfer.files);
    },
  };

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      multiple={multiple}
      accept={acceptAttr(uploadType, accept)}
      className="sr-only"
      onChange={event => {
        addFiles(event.target.files);
        event.target.value = '';
      }}
    />
  );

  if (compact) {
    return (
      <div className={cn('w-full', className)}>
        <Button
          type="button"
          variant="outline"
          aria-label={ariaLabel ?? 'Add images'}
          onClick={() => inputRef.current?.click()}
          {...dropHandlers}
          className={cn(
            'h-auto w-full justify-start gap-3 border-dashed px-4 py-3 text-left',
            isDragging ? 'border-primary bg-primary/5' : 'bg-muted/40',
          )}
        >
          {fileInput}
          <span className="flex size-8 shrink-0 items-center justify-center rounded-card-sm bg-primary/10 text-primary">
            <UploadIcon className="size-4" aria-hidden="true" />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="text-sm font-medium text-foreground">
              {title ?? <Trans message="Add images" />}
            </span>
            {hint && (
              <span className="text-xs font-normal text-muted-foreground">
                {hint}
              </span>
            )}
          </span>
        </Button>
      </div>
    );
  }

  const content = (
    <>
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
          {...dropHandlers}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-card border border-dashed p-6 text-center transition-colors outline-none hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/20',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-border bg-muted/40 hover:bg-muted/60',
          )}
        >
          {fileInput}
          <div className="flex size-9 items-center justify-center rounded-card-sm bg-primary/10 text-primary">
            <UploadIcon className="size-4" aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-foreground">
              {title ??
                (isDragging ? (
                  <Trans message="Release to upload" />
                ) : (
                  <Trans message="Drag & drop files or click to browse" />
                ))}
            </p>
            <p className="text-xs text-muted-foreground">
              {description ?? hint ?? (
                <Trans message="Files are validated before upload" />
              )}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={event => {
              event.stopPropagation();
              inputRef.current?.click();
            }}
          >
            <UploadIcon data-icon="inline-start" aria-hidden="true" />
            <Trans message="Browse files" />
          </Button>
        </div>

        {items.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground tabular-nums">
                <span className="font-medium text-foreground">
                  {items.length}
                </span>{' '}
                {items.length === 1 ? (
                  <Trans message="File" />
                ) : (
                  <Trans message="Files" />
                )}
              </p>
              <button
                type="button"
                onClick={() => setItems([])}
                className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <Trans message="Clear All" />
              </button>
            </div>

            <ul className="flex flex-col gap-2">
              {items.map(item => (
                <li key={item.id}>
                  <Attachment
                    state={
                      item.status === 'uploading'
                        ? 'uploading'
                        : item.status === 'done'
                          ? 'done'
                          : 'error'
                    }
                    size="sm"
                    className="w-full"
                  >
                    <AttachmentMedia>
                      {item.status === 'error' ? (
                        <TriangleAlertIcon aria-hidden="true" />
                      ) : item.status === 'done' ? (
                        <CheckIcon className="text-primary" aria-hidden="true" />
                      ) : (
                        <Spinner />
                      )}
                    </AttachmentMedia>
                    <AttachmentContent>
                      <AttachmentTitle>{item.name}</AttachmentTitle>
                      <AttachmentDescription className="tabular-nums">
                        {item.status === 'error'
                          ? (item.error ?? <Trans message="Upload failed" />)
                          : item.status === 'done'
                            ? `Uploaded ${formatUploadSize(item.size)}`
                            : `Uploading ${Math.round(item.progress)}%`}
                      </AttachmentDescription>
                    </AttachmentContent>
                    <AttachmentActions>
                      <AttachmentAction
                        aria-label={`Remove ${item.name}`}
                        onClick={() => removeItem(item.id)}
                      >
                        <XIcon aria-hidden="true" />
                      </AttachmentAction>
                    </AttachmentActions>
                  </Attachment>
                </li>
              ))}
            </ul>
          </div>
        )}
    </>
  );

  if (bare) {
    return <div className={cn('flex w-full flex-col gap-3', className)}>{content}</div>;
  }

  return (
    <Card.Root className={cn('w-full', className)}>
      <Card.Content className="flex flex-col gap-5">{content}</Card.Content>
    </Card.Root>
  );
}
