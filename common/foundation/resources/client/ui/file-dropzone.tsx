import {Button} from '@shadcn/button/button';
import {cn} from '@ui/utils/cn';
import {Trans} from '@ui/i18n/trans';
import {UploadIcon} from 'lucide-react';
import {useRef, useState, type ReactNode} from 'react';

type DropzoneStatus = 'idle' | 'uploading';

interface FileDropzoneProps {
  accept?: string;
  title: ReactNode;
  description?: ReactNode;
  hint?: ReactNode;
  status?: DropzoneStatus;
  progress?: number;
  onFile: (file: File) => void;
  className?: string;
}

export function FileDropzone({
  accept,
  title,
  description,
  hint,
  status = 'idle',
  progress = 0,
  onFile,
  className,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const uploading = status === 'uploading';

  return (
    <div
      className={cn(
        'group flex flex-col items-center gap-2 rounded-card border border-dashed p-6 text-center transition-colors',
        uploading
          ? 'border-primary/50 bg-primary/5'
          : isDragging
            ? 'border-primary bg-primary/5'
            : 'hover:bg-muted/30',
        className,
      )}
      onDragOver={e => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={e => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) onFile(file);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = '';
        }}
      />
      {uploading ? (
        <div className="flex w-full flex-col items-center gap-2">
          <span className="text-sm font-medium">
            <Trans message="Uploading..." />
          </span>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{width: `${Math.min(100, Math.round(progress))}%`}}
            />
          </div>
        </div>
      ) : (
        <>
          <UploadIcon className="size-5 text-muted-foreground" />
          <span className="text-sm font-medium">{title}</span>
          {description ? (
            <span className="text-xs text-muted-foreground">{description}</span>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => inputRef.current?.click()}
          >
            <UploadIcon />
            <Trans message="Browse files" />
          </Button>
          {hint ? (
            <span className="text-xs text-muted-foreground">{hint}</span>
          ) : null}
        </>
      )}
    </div>
  );
}
