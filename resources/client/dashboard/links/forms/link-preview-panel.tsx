import {LinkPreviewDialog} from '@app/dashboard/links/dialogs/link-preview-dialog';
import {LinkeableFormDecoratedPanel} from '@app/dashboard/links/forms/linkeable-form-decorated-panel';
import {useDebouncedDestinationUrl} from '@app/dashboard/links/forms/use-debounced-destination-url';
import {urlIsValid} from '@app/dashboard/links/utils/url-is-valid';
import {getMetadataFromUrl} from '@app/gen/links';
import {CrupdateLinkBody} from '@app/gen/schemas/crupdate-link-body';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {Spinner} from '@shadcn/spinner/spinner';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {cn} from '@ui/utils/cn';
import {EditIcon, ImageIcon} from 'lucide-react';
import {useEffect, useState} from 'react';
import {useFormContext, useWatch} from 'react-hook-form';

type FormValue = Awaited<ReturnType<typeof getMetadataFromUrl>>;

const responseCache = new Map<string, FormValue>();
let activeAbortController: AbortController | null = null;

type Props = {
  compact?: boolean;
  variant?: 'outline' | 'default';
};
export function LinkPreviewPanel({
  compact = false,
  variant = 'default',
}: Props) {
  const {trans} = useTrans();
  const url = useDebouncedDestinationUrl({
    formKey: 'long_url',
  });

  const {setValue} = useFormContext<CrupdateLinkBody>();
  const [fetchInProgress, setFetchInProgress] = useState(false);

  useEffect(() => {
    if (url && urlIsValid(url)) {
      const setMetaOnForm = (meta: FormValue) => {
        if (meta.name) {
          setValue('name', meta.name, {shouldDirty: true});
        }
        if (meta.description) {
          setValue('description', meta.description, {shouldDirty: true});
        }
        if (meta.image) {
          setValue('image', meta.image, {shouldDirty: true});
        }
      };

      // have meta cached for this url
      if (responseCache.has(url)) {
        const response = responseCache.get(url);
        if (response) {
          setMetaOnForm(response);
          return;
        }
      }

      if (activeAbortController) {
        activeAbortController.abort();
      }
      activeAbortController = new AbortController();

      setFetchInProgress(true);

      // fetch meta tags from backend
      getMetadataFromUrl({url}, {signal: activeAbortController.signal})
        .then(async r => {
          if (r.name || r.description || r.image) {
            responseCache.set(url, r);
          }

          setMetaOnForm(r);
        })
        .finally(() => {
          activeAbortController = null;
          setFetchInProgress(false);
        });
    }
  }, [url, setValue]);

  return (
    <LinkeableFormDecoratedPanel
      variant={variant}
      title={<Trans message="Link preview" />}
      floatingActions={<LinkPreviewDialogButton />}
      footer={
        <>
          <HookForm.Field name="name">
            <Field.Label className={cn(compact && 'sr-only')}>
              <Trans message="Title" />
            </Field.Label>
            <Input
              className={cn(compact && 'h-8')}
              placeholder={
                !compact ? undefined : trans({message: 'Enter a title...'})
              }
            />
            <Field.Error />
          </HookForm.Field>

          {!compact ? (
            <HookForm.Field name="description">
              <Field.Label>
                <Trans message="Description" />
              </Field.Label>
              {compact ? <Input className="h-7" /> : <Textarea />}
              <Field.Error />
            </HookForm.Field>
          ) : null}
        </>
      }
    >
      <div className="flex h-31 items-center justify-center overflow-hidden text-sm break-all">
        <ImagePreview isLoading={fetchInProgress} />
      </div>
    </LinkeableFormDecoratedPanel>
  );
}

function LinkPreviewDialogButton() {
  const {setValue, control} = useFormContext<CrupdateLinkBody>();
  const name = useWatch({name: 'name', control}) ?? null;
  const description = useWatch({name: 'description', control}) ?? null;
  const image = useWatch({name: 'image', control}) ?? null;
  return (
    <LinkPreviewDialog
      values={{name, description, image}}
      onSubmit={values => {
        setValue('name', values.name, {shouldDirty: true});
        setValue('description', values.description, {shouldDirty: true});
        setValue('image', values.image, {shouldDirty: true});
      }}
    >
      <Dialog.Trigger
        render={
          <Button
            variant="default"
            color="white"
            size="icon"
            className="bg-background shadow-sm"
          />
        }
      >
        <EditIcon />
      </Dialog.Trigger>
    </LinkPreviewDialog>
  );
}

function ImagePreview({isLoading}: {isLoading: boolean}) {
  const image = useWatch({name: 'image'});
  if (isLoading) {
    return <Spinner className="size-4" />;
  }

  if (!image) {
    return (
      <div className="flex max-w-32 flex-col items-center justify-center gap-2">
        <ImageIcon />
        <p className="text-center text-xs break-normal">
          <Trans message="Enter a link to generate a preview." />
        </p>
      </div>
    );
  }

  return <img src={image} alt="" className="h-full w-full object-cover" />;
}
