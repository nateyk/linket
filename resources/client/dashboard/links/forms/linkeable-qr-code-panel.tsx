import {LinkeableFormDecoratedPanel} from '@app/dashboard/links/forms/linkeable-form-decorated-panel';
import {buildQrCodeUrl} from '@app/dashboard/qr-codes/build-qr-code-url';
import {QrCodeRenderer} from '@app/dashboard/qr-codes/qr-code-renderer';
import {SelectQrCodeStyleDialog} from '@app/dashboard/qr-codes/style-dialog/select-qr-code-style-dialog';
import {PermissionAwareButton} from '@app/dashboard/upgrade/permission-aware-button';
import {useDatatableRouteType} from '@app/dashboard/use-datatable-route-type';
import {CrupdateLinkBody} from '@app/gen/schemas/crupdate-link-body';
import {QrCode} from '@app/gen/schemas/qr-code';
import {Button, LinkButton} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Switch} from '@shadcn/forms/switch/switch';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {EditIcon, ExternalLinkIcon, LockKeyholeIcon} from 'lucide-react';
import {useFormContext, useWatch} from 'react-hook-form';

type Props = {
  className?: string;
  qrCode?: Pick<QrCode, 'id' | 'back_half'> | null;
  previewSize?: number;
  variant?: 'outline' | 'default';
};
export function LinkeableQRCodePanel({
  className,
  qrCode,
  previewSize = 68,
  variant = 'default',
}: Props) {
  const {routeType} = useDatatableRouteType();
  const {base_url} = useSettings();
  let url = base_url;
  if (qrCode) {
    url = buildQrCodeUrl(qrCode);
  }

  const {setValue, control} = useFormContext<CrupdateLinkBody>();
  const createQrCode = useWatch({
    name: 'create_qr_code',
    control,
  });
  const qrCodeStyle = useWatch({
    name: 'qr_code_style',
    control,
  });
  const isDisabled = !createQrCode && !qrCode;

  const previewDialogTrigger = (
    <SelectQrCodeStyleDialog
      url={url}
      style={qrCodeStyle ?? undefined}
      onSubmit={style => {
        setValue('qr_code_style', style, {shouldDirty: true});
      }}
    >
      <Dialog.Trigger
        render={
          <Button
            variant="default"
            color="white"
            size="icon-sm"
            className="bg-background shadow-sm"
          />
        }
      >
        <EditIcon />
      </Dialog.Trigger>
    </SelectQrCodeStyleDialog>
  );

  const titleAction = qrCode ? (
    <LinkButton
      variant="ghost"
      size="icon-xs"
      to={`/${routeType}/qr-codes/${qrCode.id}`}
    >
      <ExternalLinkIcon className="size-4" />
    </LinkButton>
  ) : (
    <HookForm.Field name="create_qr_code" className="mr-1 w-max">
      <Switch />
    </HookForm.Field>
  );

  return (
    <LinkeableFormDecoratedPanel
      disabled={isDisabled}
      variant={variant}
      title={
        <>
          <Trans message="QR Code" />
          <PermissionAwareButton resource="qrCode" action="create">
            {allowed =>
              allowed ? (
                titleAction
              ) : (
                <div className="flex items-center gap-1.5">
                  <LockKeyholeIcon className="size-4" />
                  {titleAction}
                </div>
              )
            }
          </PermissionAwareButton>
        </>
      }
      className={className}
      floatingActions={previewDialogTrigger}
    >
      <QrCodeRenderer
        url={url}
        size={previewSize}
        style={qrCodeStyle ?? undefined}
      />
    </LinkeableFormDecoratedPanel>
  );
}
