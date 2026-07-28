import {LinkFormActionButtons} from '@app/dashboard/links/forms/link-form-action-buttons';
import {LinkeableFormDecoratedPanel} from '@app/dashboard/links/forms/linkeable-form-decorated-panel';
import {ShortUrlField} from '@app/dashboard/links/forms/short-url-field';
import {QrCodeRenderer} from '@app/dashboard/qr-codes/qr-code-renderer';
import {createQrCodeOptions} from '@app/dashboard/qr-codes/qr-codes-queries';
import {SelectQrCodeStyleDialog} from '@app/dashboard/qr-codes/style-dialog/select-qr-code-style-dialog';
import {CrupdateQrCodeBody} from '@app/gen/schemas/crupdate-qr-code-body';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {Button} from '@shadcn/button/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@shadcn/collapsible/collapsible';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {Switch} from '@shadcn/forms/switch/switch';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CornerDownLeftIcon,
  PencilIcon,
  QrCodeIcon,
} from 'lucide-react';
import {ReactElement, useState} from 'react';
import {useForm, useFormContext, useWatch} from 'react-hook-form';

type CreateQrCodeDialogProps = {
  children: ReactElement<typeof Dialog.Trigger>;
};
export function CreateQrCodeDialog({children}: CreateQrCodeDialogProps) {
  const [open, setOpen] = useState(false);
  const form = useForm<CrupdateQrCodeBody>({
    defaultValues: {
      name: '',
      long_url: '',
      short_link: {
        create: false,
        back_half: '',
        domain_id: 0,
      },
    },
  });

  const createQrCode = useMutation(createQrCodeOptions());

  const handleSubmit = (values: CrupdateQrCodeBody) => {
    createQrCode.mutate(values, {
      onSuccess: () => {
        toast.success(<Trans message="QR code created" />);
        setOpen(false);
      },
      onError: err => onFormQueryError(err, form),
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {children}
      <Dialog.Portal>
        <Dialog.Backdrop />
        <HookForm.Root form={form} onSubmit={handleSubmit}>
          <Dialog.Content className="sm:max-w-4xl">
            <Dialog.Header>
              <Dialog.Title>
                <QrCodeIcon />
                <Trans message="New QR code" />
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body className="flex flex-col items-start gap-8.5 md:flex-row">
              <FormFields />
              <section className="relative isolate w-full shrink-0 md:w-70">
                <QrCodePreviewPanel />
              </section>
            </Dialog.Body>
            <Dialog.Footer variant="muted" className="py-4 sm:justify-between">
              <LinkFormActionButtons form={form} className="mt-4 md:mt-0" />
              <Button
                variant="default"
                color="primary"
                size="sm"
                type="submit"
                disabled={createQrCode.isPending}
              >
                <Trans message="Create QR code" />
                <CornerDownLeftIcon data-icon="inline-end" />
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </HookForm.Root>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function FormFields() {
  return (
    <Field.Group>
      <HookForm.Field name="long_url">
        <Field.Label>
          <Trans message="Destination URL" />
        </Field.Label>
        <Input
          placeholder="https://example.com"
          autoComplete="off"
          spellCheck={false}
          required
          autoFocus
        />
        <Field.Error />
      </HookForm.Field>
      <HookForm.Field name="name">
        <Field.Label>
          <Trans message="Title (optional)" />
        </Field.Label>
        <Input />
        <Field.Error />
      </HookForm.Field>
      <MoreOptionsPanel />
    </Field.Group>
  );
}

function MoreOptionsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const isShortLinkEnabled = useWatch({
    name: 'short_link.create',
  });
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 rounded-md text-left text-sm font-medium">
        <Trans message="Sharing options" />
        {isOpen ? (
          <ChevronDownIcon className="size-4" />
        ) : (
          <ChevronRightIcon className="size-4" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        <Field.Group>
          <HookForm.Field name="short_link.create">
            <Field.Label>
              <Switch />
              <Trans message="Create short link" />
            </Field.Label>
          </HookForm.Field>
          <div
            className={
              !isShortLinkEnabled ? 'pointer-events-none opacity-50' : undefined
            }
          >
            <ShortUrlField
              backHalfName="short_link.back_half"
              domainName="short_link.domain_id"
              disabled={!isShortLinkEnabled}
            />
          </div>
        </Field.Group>
      </CollapsibleContent>
    </Collapsible>
  );
}

function QrCodePreviewPanel() {
  const {base_url} = useSettings();
  const form = useFormContext<CrupdateQrCodeBody>();
  const style = useWatch({name: 'style', control: form.control});

  return (
    <LinkeableFormDecoratedPanel
      title={<Trans message="QR Code preview" />}
      floatingActions={
        <SelectQrCodeStyleDialog
          url={base_url}
          style={style}
          onSubmit={style => {
            form.setValue('style', style, {shouldDirty: true});
          }}
        >
          <Dialog.Trigger
            render={
              <Button
                variant="default"
                color="white"
                size="icon-sm"
                className="shadow-sm"
              />
            }
          >
            <PencilIcon />
          </Dialog.Trigger>
        </SelectQrCodeStyleDialog>
      }
    >
      <QrCodeRenderer url={base_url} size={124} style={style} />
    </LinkeableFormDecoratedPanel>
  );
}
