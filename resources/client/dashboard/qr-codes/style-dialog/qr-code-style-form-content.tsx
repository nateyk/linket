import {LinkeableFormDecoratedPanel} from '@app/dashboard/links/forms/linkeable-form-decorated-panel';
import {QrCodeRenderer} from '@app/dashboard/qr-codes/qr-code-renderer';
import {CrupdateQrCodeBody} from '@app/gen/schemas/crupdate-qr-code-body';
import {QrCodeStyle} from '@app/gen/schemas/qr-code-style';
import {UploadType} from '@app/site-config';
import {ImageSelector} from '@common/uploads/components/image-selector';
import {FileUploadProvider} from '@common/uploads/uploader/file-upload-provider';
import {Button} from '@shadcn/button/button';
import {Popover} from '@shadcn/popover/popover';
import {ButtonBase} from '@ui/buttons/button-base';
import {ColorField} from '@ui/color-picker/color-field';
import {FormSwitch} from '@ui/forms/toggle/switch';
import {Trans} from '@ui/i18n/trans';
import clsx from 'clsx';
import {CheckIcon, CircleQuestionMarkIcon} from 'lucide-react';
import {ReactNode} from 'react';
import {useFormContext, useWatch} from 'react-hook-form';

const colorPresets = [
  '#000000',
  '#C62828',
  '#e97777',
  '#f7a4a4',
  '#f5d5ae',
  '#049372',
  '#1e8bc3',
  '#8e44ad',
];

type FormValue = Required<CrupdateQrCodeBody>['style'];

type QrCodeStyleFormContentProps = {
  url: string;
};
export function QrCodeStyleFormContent({url}: QrCodeStyleFormContentProps) {
  return (
    <div className="flex flex-col gap-6">
      <QrCodeStylePreview url={url} />
      <LogoSection />
      <ColorSection />
      <BgColorSection />
    </div>
  );
}

export function getQrCodeStyleFormDefaultValues(
  style?: QrCodeStyle | null,
): FormValue {
  return {
    color: style?.color ?? colorPresets[0],
    showLogo: !!style?.showLogo,
    logoUrl: style?.logoUrl ?? '',
  };
}

type QrCodeStylePreviewProps = {
  url: string;
};
function QrCodeStylePreview({url}: QrCodeStylePreviewProps) {
  const style = useWatch<FormValue>();

  return (
    <LinkeableFormDecoratedPanel
      title={
        <span className="inline-flex items-center">
          <Trans message="QR code preview" />
          <InfoDialogTrigger>
            <Trans message="Preview of how your QR code will look with the current style settings." />
          </InfoDialogTrigger>
        </span>
      }
    >
      <QrCodeRenderer url={url} size={160} style={style} />
    </LinkeableFormDecoratedPanel>
  );
}

function LogoSection() {
  const {setValue, control} = useFormContext<FormValue>();
  const showLogo = useWatch({name: 'showLogo', control});
  const imageValue = useWatch({name: 'logoUrl', control}) ?? '';

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center text-sm">
          <Trans message="Logo" />
          <InfoDialogTrigger>
            <Trans message="Upload a custom logo to display in the center of the QR code." />
          </InfoDialogTrigger>
        </span>
        <FormSwitch name="showLogo" />
      </div>
      {showLogo ? (
        <FileUploadProvider>
          <ImageSelector.Input
            className="bg-muted/50"
            uploadType={UploadType.linkImages}
            value={imageValue}
            onChange={value => {
              setValue('logoUrl', value, {
                shouldDirty: true,
              });
            }}
          />
        </FileUploadProvider>
      ) : null}
    </div>
  );
}

function ColorSection() {
  const color = useWatch<FormValue, 'color'>({name: 'color'});
  const {setValue} = useFormContext<FormValue>();

  return (
    <div>
      <div className="flex flex-wrap items-end gap-4">
        <ColorField
          label={<Trans message="QR code color" />}
          value={color ?? ''}
          className="flex-1"
          onChange={newColor => {
            setValue('color', newColor, {shouldDirty: true});
          }}
        />
        <div className="flex shrink-0 items-center gap-2 pb-1">
          {colorPresets.map(preset => (
            <ButtonBase
              key={preset}
              className={clsx(
                'relative size-7 rounded-full transition-button',
                color === preset
                  ? 'ring-1 ring-foreground ring-offset-2'
                  : 'hover:ring-2 hover:ring-foreground/20',
              )}
              style={{backgroundColor: preset}}
              onClick={() => setValue('color', preset, {shouldDirty: true})}
            >
              {color === preset ? (
                <CheckIcon className="absolute inset-0 m-auto size-4 text-white" />
              ) : null}
            </ButtonBase>
          ))}
        </div>
      </div>
    </div>
  );
}

function BgColorSection() {
  const bgColor = useWatch<FormValue, 'bgColor'>({name: 'bgColor'});
  const {setValue} = useFormContext<FormValue>();

  return (
    <div>
      <div className="flex flex-wrap items-end gap-6">
        <ColorField
          label={<Trans message="Background color" />}
          value={bgColor ?? ''}
          className="flex-1"
          onChange={newColor => {
            setValue('bgColor', newColor, {shouldDirty: true});
          }}
        />
      </div>
    </div>
  );
}

function InfoDialogTrigger({children}: {children: ReactNode}) {
  return (
    <Popover.Root>
      <Popover.Trigger
        render={<Button variant="ghost" size="icon-sm" />}
        className="text-muted-foreground"
        openOnHover
      >
        <CircleQuestionMarkIcon />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content>{children}</Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
