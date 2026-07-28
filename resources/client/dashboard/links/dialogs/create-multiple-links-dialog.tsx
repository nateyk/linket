import {LinkDomainSelect} from '@app/dashboard/links/forms/link-domain-select';
import {LinkFolderField} from '@app/dashboard/links/forms/link-folder-field';
import {LinkFormActionButtons} from '@app/dashboard/links/forms/link-form-action-buttons';
import {createMultipleLinksOptions} from '@app/dashboard/links/links-queries';
import {urlIsValid} from '@app/dashboard/links/utils/url-is-valid';
import {useLinkDefaultFormValues} from '@app/dashboard/links/utils/use-linkeable-default-form-values';
import {BulkCreateLinksBody} from '@app/gen/schemas/bulk-create-links-body';
import {Folder} from '@app/gen/schemas/folder';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {useControlledState} from '@react-stately/utils';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {CornerDownLeftIcon, LinkIcon} from 'lucide-react';
import {useForm} from 'react-hook-form';

type MultipleLinksFormValue = Omit<BulkCreateLinksBody, 'long_urls'> & {
  long_urls: string;
};

interface Props {
  folder?: Folder | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}
export function CreateMultipleLinksDialog({
  folder,
  open: openProp,
  onOpenChange: onOpenChangeProp,
  children,
}: Props) {
  const [open, setOpen] = useControlledState(openProp, false, onOpenChangeProp);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {children}
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Content folder={folder} onClose={() => setOpen(false)} />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Content({
  folder,
  onClose,
}: {
  folder: Props['folder'];
  onClose: () => void;
}) {
  const {trans} = useTrans();
  const defaultValues = useLinkDefaultFormValues({folder});
  const form = useForm<MultipleLinksFormValue>({
    defaultValues: {
      domain_id: defaultValues.domain_id,
      folder_id: defaultValues.folder_id,
    },
  });
  const createMultiple = useMutation(createMultipleLinksOptions());

  const handleSubmit = (values: MultipleLinksFormValue) => {
    const someUrlsInvalid =
      !values.long_urls ||
      splitUrls(values.long_urls).some(url => !urlIsValid(url));
    if (someUrlsInvalid) {
      form.setError('long_urls', {
        message: trans(message('Some of the urls are not valid.')),
      });
    } else {
      createMultiple.mutate(
        {
          ...values,
          long_urls: splitUrls(values.long_urls),
        },
        {
          onSuccess: response => {
            onClose();
            toast.success(
              <Trans
                message="[one 1 link|other :count links] shortened"
                values={{count: response.data.length}}
              />,
            );
          },
          onError: err => onFormQueryError(err, form, [], true),
        },
      );
    }
  };

  return (
    <HookForm.Root form={form} onSubmit={handleSubmit}>
      <Dialog.Content className="sm:max-w-3xl">
        <Dialog.Header>
          <Dialog.Title>
            <LinkIcon />
            <Trans message="Shorten multiple links" />
          </Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>
          <Field.Group>
            <HookForm.Field name="long_urls">
              <Field.Label>
                <Trans message="Multiple URLs (one per line)" />
              </Field.Label>
              <Textarea
                rows={10}
                autoComplete="off"
                spellCheck="false"
                required
                autoFocus
              />
              <Field.Error />
            </HookForm.Field>
            <LinkDomainSelect
              name="domain_id"
              label={<Trans message="Domain" />}
              className="w-full"
            />
            <LinkFolderField />
          </Field.Group>
        </Dialog.Body>
        <Dialog.Footer variant="muted" className="py-4 sm:justify-between">
          <LinkFormActionButtons form={form as any} />
          <Button
            size="sm"
            variant="default"
            color="primary"
            type="submit"
            disabled={createMultiple.isPending}
          >
            <Trans message="Shorten" />
            <CornerDownLeftIcon />
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </HookForm.Root>
  );
}

function splitUrls(urls: string): string[] {
  return urls.split(/\r?\n/).filter(url => urlIsValid(url));
}
