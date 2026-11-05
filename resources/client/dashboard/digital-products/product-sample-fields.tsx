import {SharedFileUploader} from '@common/ui/file-uploader';
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
import {Input} from '@shadcn/forms/input/input';
import {FormattedBytes} from '@ui/i18n/formatted-bytes';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  FileTextIcon,
  HeadphonesIcon,
  Trash2Icon,
} from 'lucide-react';
import type {ProductSampleDraft} from './product-creation-context';

export const MAX_AUDIO_SAMPLES = 8;

export function sampleSectionKind(
  type: string | null | undefined,
): 'audio' | 'pdf' | null {
  if (type === 'audio') return 'audio';
  if (type === 'ebook' || type === 'digital') return 'pdf';
  return null;
}

export function ProductSampleFields({
  kind,
  productType,
  samples,
  onChange,
  error,
}: {
  kind: 'audio' | 'pdf';
  productType?: 'digital' | 'ebook';
  samples: ProductSampleDraft[];
  onChange: (samples: ProductSampleDraft[]) => void;
  error?: string;
}) {
  const {trans} = useTrans();
  const atAudioCap = kind === 'audio' && samples.length >= MAX_AUDIO_SAMPLES;

  const addSample = (entry: {
    id: number;
    name: string;
    file_size?: number;
    extension?: string;
  }) => {
    const next: ProductSampleDraft = {
      fileEntryId: entry.id,
      name: entry.name,
      fileSize: entry.file_size,
      extension: entry.extension,
      title: entry.name.replace(/\.[^.]+$/, ''),
      durationMs: null,
    };
    if (kind === 'pdf') {
      onChange([next]);
      return;
    }
    if (samples.some(sample => sample.fileEntryId === entry.id)) return;
    if (samples.length >= MAX_AUDIO_SAMPLES) return;
    onChange([...samples, next]);
  };

  return (
    <div className="flex flex-col gap-3" id="product-samples" tabIndex={-1}>
      {kind === 'audio' ? (
        <p className="text-sm text-muted-foreground">
          <Trans message="Short clips buyers can play before purchase. Full tracks stay private." />
        </p>
      ) : productType === 'digital' ? (
        <p className="text-sm text-muted-foreground">
          <Trans message="Offer a short PDF sample before purchase. Your full product files stay private." />
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          <Trans message="Upload a short PDF of sample pages. Buyers see this on the product page; your full ebook stays private." />
        </p>
      )}

      {!atAudioCap && (
        <SharedFileUploader
          uploadType="digitalProductSamples"
          bare
          accept={kind === 'audio' ? '.mp3,.m4a,.wav' : '.pdf'}
          hint={
            kind === 'audio'
              ? trans(message('MP3, M4A, or WAV'))
              : trans(message('PDF'))
          }
          onUploaded={entry =>
            addSample({
              id: entry.id,
              name: entry.name,
              file_size: entry.file_size,
              extension: entry.extension ?? undefined,
            })
          }
        />
      )}

      {atAudioCap && (
        <p className="text-sm text-muted-foreground">
          <Trans message="You can add up to 8 preview tracks." />
        </p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!!samples.length && (
        <ul className="flex flex-col gap-2">
          {samples.map((sample, index) => {
            const Icon = kind === 'audio' ? HeadphonesIcon : FileTextIcon;
            return (
              <li key={sample.fileEntryId}>
                <Attachment state="done" size="sm" className="w-full">
                  <AttachmentMedia>
                    <Icon aria-hidden="true" />
                  </AttachmentMedia>
                  <AttachmentContent>
                    {kind === 'audio' ? (
                      <Input
                        aria-label={trans(message('Preview title'))}
                        value={sample.title}
                        onChange={event => {
                          const title = event.target.value;
                          onChange(
                            samples.map(item =>
                              item.fileEntryId === sample.fileEntryId
                                ? {...item, title}
                                : item,
                            ),
                          );
                        }}
                      />
                    ) : (
                      <AttachmentTitle>{sample.name}</AttachmentTitle>
                    )}
                    <AttachmentDescription className="tabular-nums">
                      {sample.fileSize ? (
                        <FormattedBytes bytes={sample.fileSize} />
                      ) : null}
                      {sample.durationMs
                        ? ` · ${formatDuration(sample.durationMs)}`
                        : null}
                    </AttachmentDescription>
                  </AttachmentContent>
                  <AttachmentActions>
                    {kind === 'audio' && (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={index === 0}
                          aria-label={trans(message('Move preview up'))}
                          onClick={() => onChange(moveSample(samples, index, -1))}
                        >
                          <ChevronUpIcon aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={index === samples.length - 1}
                          aria-label={trans(message('Move preview down'))}
                          onClick={() => onChange(moveSample(samples, index, 1))}
                        >
                          <ChevronDownIcon aria-hidden="true" />
                        </Button>
                      </>
                    )}
                    <AttachmentAction
                      aria-label={trans(
                        message('Remove :name', {values: {name: sample.name}}),
                      )}
                      onClick={() =>
                        onChange(
                          samples.filter(
                            item => item.fileEntryId !== sample.fileEntryId,
                          ),
                        )
                      }
                    >
                      <Trash2Icon aria-hidden="true" />
                    </AttachmentAction>
                  </AttachmentActions>
                </Attachment>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function moveSample(
  samples: ProductSampleDraft[],
  index: number,
  delta: number,
): ProductSampleDraft[] {
  const next = samples.slice();
  const target = index + delta;
  if (target < 0 || target >= next.length) return samples;
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}

function formatDuration(durationMs: number): string {
  const total = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
