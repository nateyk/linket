import {LinkFormActionButtons} from '@app/dashboard/links/forms/link-form-action-buttons';
import {LinkeableFormDecoratedPanel} from '@app/dashboard/links/forms/linkeable-form-decorated-panel';
import {LinkeableTagsField} from '@app/dashboard/links/forms/linkeable-tags-field';
import {FormattedUrl} from '@app/dashboard/links/utils/formatted-url';
import {useLinkeableDefaultFormValues} from '@app/dashboard/links/utils/use-linkeable-default-form-values';
import {buildQrCodeUrl} from '@app/dashboard/qr-codes/build-qr-code-url';
import {QrCodeRenderer} from '@app/dashboard/qr-codes/qr-code-renderer';
import {
  retrieveQrCodeOptions,
  updateQrCodeOptions,
} from '@app/dashboard/qr-codes/qr-codes-queries';
import {SelectQrCodeStyleDialog} from '@app/dashboard/qr-codes/style-dialog/select-qr-code-style-dialog';
import {useDatatableRouteType} from '@app/dashboard/use-datatable-route-type';
import {CrupdateQrCodeBody} from '@app/gen/schemas/crupdate-qr-code-body';
import {QrCode} from '@app/gen/schemas/qr-code';
import {DirtyFormSaveDrawer} from '@common/admin/crupdate-resource-layout';
import {UserAvatar} from '@common/auth/user-avatar';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {useNavigate} from '@common/ui/navigation/use-navigate';
import {useRequiredParams} from '@common/ui/navigation/use-required-params';
import {Button, LinkButton} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {toast} from '@shadcn/toast/toast';
import {useMutation, useSuspenseQuery} from '@tanstack/react-query';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {Trans} from '@ui/i18n/trans';
import useClipboard from '@ui/utils/hooks/use-clipboard';
import {useMediaQuery} from '@ui/utils/hooks/use-media-query';
import {
  CheckIcon,
  CopyIcon,
  CornerDownRightIcon,
  PencilIcon,
} from 'lucide-react';
import {useForm, useFormContext, useWatch} from 'react-hook-form';
import {Link} from 'react-router';

export function Component() {
  const {routeType} = useDatatableRouteType();
  const navigate = useNavigate();
  const {qrCodeId} = useRequiredParams(['qrCodeId']);
  const query = useSuspenseQuery(retrieveQrCodeOptions(Number(qrCodeId)));
  const qrCode = query.data.data;
  const linkeableDefaultValues = useLinkeableDefaultFormValues(qrCode as any);
  const form = useForm<CrupdateQrCodeBody>({
    defaultValues: {
      ...linkeableDefaultValues,
      name: qrCode.name ?? '',
      long_url: qrCode.long_url ?? '',
      style: qrCode.style ?? undefined,
    },
  });
  const updateQrCode = useMutation(updateQrCodeOptions(Number(qrCodeId)));
  const shouldCollapseSidebar = useMediaQuery('(max-width: 1200px)');

  const handleSubmit = (values: CrupdateQrCodeBody) => {
    updateQrCode.mutate(values, {
      onSuccess: () => {
        navigate(`/${routeType}/qr-codes`, {relative: 'path'});
        toast.success(<Trans message="QR code updated" />);
      },
      onError: err => onFormQueryError(err, form),
    });
  };

  return (
    <HookForm.Root
      className="flex h-full min-h-0"
      form={form}
      onSubmit={handleSubmit}
    >
      <DirtyFormSaveDrawer isLoading={updateQrCode.isPending} />
      <Field.Group className="compact-scrollbar mx-auto max-w-xl flex-auto overflow-y-auto px-4 lg:pt-6">
        <HookForm.Field name="name">
          <Field.Label>
            <Trans message="Title (optional)" />
          </Field.Label>
          <Input autoFocus />
          <Field.Error />
        </HookForm.Field>
        <LinkeableTagsField />
        {!qrCode.linkeable ? (
          <HookForm.Field name="long_url">
            <Field.Label>
              <Trans message="Destination URL" />
            </Field.Label>
            <Input
              placeholder="https://example.com"
              autoComplete="off"
              spellCheck="false"
              required
            />
            <Field.Error />
          </HookForm.Field>
        ) : (
          <LinkeableInfoPanel linkeable={qrCode.linkeable} />
        )}
        <LinkFormActionButtons form={form} />
        {shouldCollapseSidebar && (
          <QrCodeSidebarPanel previewSize={120} qrCode={qrCode} />
        )}
        <Field.Separator />
        <OwnerInfoSection qrCode={qrCode} />
      </Field.Group>
      {!shouldCollapseSidebar ? (
        <section className="compact-scrollbar hidden w-80 shrink-0 overflow-y-auto border-l border-border/80 p-6 lg:block">
          <QrCodeSidebarPanel previewSize={220} qrCode={qrCode} />
        </section>
      ) : null}
    </HookForm.Root>
  );
}

type QrCodeSidebarPanelProps = {
  qrCode: QrCode;
  className?: string;
  previewSize: number;
};
function QrCodeSidebarPanel({
  qrCode,
  className,
  previewSize,
}: QrCodeSidebarPanelProps) {
  const form = useFormContext<CrupdateQrCodeBody>();
  const style = useWatch({name: 'style', control: form.control});

  return (
    <LinkeableFormDecoratedPanel
      className={className}
      title={<Trans message="QR code preview" />}
      floatingActions={
        <SelectQrCodeStyleDialog
          url={buildQrCodeUrl(qrCode)}
          style={style}
          onSubmit={style => {
            form.setValue('style', style, {shouldDirty: true});
          }}
        >
          <Dialog.Trigger
            render={
              <Button
                className="shadow-md"
                variant="default"
                color="white"
                size="icon-sm"
              />
            }
          >
            <PencilIcon />
          </Dialog.Trigger>
        </SelectQrCodeStyleDialog>
      }
    >
      <QrCodeRenderer
        url={buildQrCodeUrl(qrCode)}
        size={previewSize}
        style={style}
      />
    </LinkeableFormDecoratedPanel>
  );
}

type LinkeableInfoPanelProps = {
  linkeable: Required<QrCode>['linkeable'];
};
function LinkeableInfoPanel({linkeable}: LinkeableInfoPanelProps) {
  const [isCopied, copyToClipboard] = useClipboard(linkeable.short_url ?? '');
  const linkeableUrl = useLinkeableUrl(linkeable);
  return (
    <div className="text-sm">
      <div className="mb-1.5 font-medium">
        <LinkeableTypeLabel linkeable={linkeable} />
      </div>
      <div className="flex items-center">
        {linkeableUrl ? (
          <Link className="hover:underline" to={linkeableUrl}>
            <FormattedUrl url={linkeable.short_url ?? ''} />
          </Link>
        ) : null}
        <Button
          className="ml-2"
          variant="ghost"
          size="icon-sm"
          onClick={() => {
            copyToClipboard();
            toast.success(<Trans message="Copied to clipboard" />);
          }}
        >
          {isCopied ? <CheckIcon /> : <CopyIcon />}
        </Button>
        {linkeableUrl ? (
          <LinkButton variant="ghost" size="icon-sm" to={linkeableUrl}>
            <PencilIcon />
          </LinkButton>
        ) : null}
      </div>
      {linkeable.final_destination_url ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <CornerDownRightIcon className="size-3" />
          <div>
            <FormattedUrl url={linkeable.final_destination_url} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function useLinkeableUrl(
  linkeable: Required<QrCode>['linkeable'],
): string | null {
  const {routeType} = useDatatableRouteType();

  switch (linkeable.model_type) {
    case 'link':
      return `/${routeType}/links/${linkeable.id}`;
    case 'folder':
      return `/${routeType}/folders/${linkeable.id}`;
    case 'biolink':
      return `/${routeType}/biolinks/${linkeable.id}`;
  }

  return null;
}

function LinkeableTypeLabel({
  linkeable,
}: {
  linkeable: Required<QrCode>['linkeable'];
}) {
  switch (linkeable.model_type) {
    case 'link':
      return <Trans message="Short link" />;
    case 'folder':
      return <Trans message="Folder" />;
    case 'biolink':
      return <Trans message="Link in bio" />;
  }
}

type OwnerInfoSectionProps = {
  qrCode: QrCode;
};
function OwnerInfoSection({qrCode}: OwnerInfoSectionProps) {
  if (!qrCode.user) return null;
  return (
    <div className="flex items-center gap-1.5 text-sm">
      <UserAvatar user={qrCode.user} size="xs" />
      <Trans
        message="Created by :name on :date"
        values={{
          name: <strong>{qrCode.user.name}</strong>,
          date: (
            <strong>
              <FormattedDate date={qrCode.created_at} />
            </strong>
          ),
        }}
      />
    </div>
  );
}
