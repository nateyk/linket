import {BackgroundStyle} from '@app/dashboard/biolink/biolink-editor/appearance/background-style';
import {ButtonStyle} from '@app/dashboard/biolink/biolink-editor/appearance/button-style';
import {useBiolinkEditorStore} from '@app/dashboard/biolink/biolink-editor/biolink-editor-store';
import {useAuth} from '@common/auth/use-auth';
import {NoFeaturePermissionPopover} from '@common/billing/upgrade/no-permission-button';
import {
  FontSelector as CommonFontSelector,
  FontDisplayName,
} from '@common/ui/font-selector/font-selector';
import {Accordion} from '@shadcn/accordion/accordion';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {ColorField} from '@ui/color-picker/color-field';
import {BrowserSafeFonts} from '@ui/fonts/font-picker/browser-safe-fonts';
import {Switch} from '@ui/forms/toggle/switch';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {
  BadgeIcon,
  ChevronDownIcon,
  ImageIcon,
  MousePointerClickIcon,
  TypeIcon,
} from 'lucide-react';
import type {ReactNode} from 'react';

export function Component() {
  const {biolink} = useSettings();

  return (
    <div className="mx-auto max-w-2xl">
      <Accordion.Root
        multiple
        variant="bordered"
        defaultValue={['background', 'buttons']}
      >
        <Accordion.Item value="background">
          <Accordion.Trigger>
            <AppearanceSectionLabel
              icon={<ImageIcon />}
              title={<Trans message="Background" />}
              description={
                <Trans message="Choose a color, gradient, pattern, or image." />
              }
            />
          </Accordion.Trigger>
          <Accordion.Content>
            <BackgroundStyle />
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="buttons">
          <Accordion.Trigger>
            <AppearanceSectionLabel
              icon={<MousePointerClickIcon />}
              title={<Trans message="Buttons" />}
              description={
                <Trans message="Style profile actions, social links, and link buttons." />
              }
            />
          </Accordion.Trigger>
          <Accordion.Content>
            <ButtonStyle />
          </Accordion.Content>
        </Accordion.Item>

        <Accordion.Item value="text">
          <Accordion.Trigger>
            <AppearanceSectionLabel
              icon={<TypeIcon />}
              title={<Trans message="Text" />}
              description={
                <Trans message="Choose the typeface and foreground color." />
              }
            />
          </Accordion.Trigger>
          <Accordion.Content>
            <TextStyle />
          </Accordion.Content>
        </Accordion.Item>

        {biolink?.show_branding ? (
          <Accordion.Item value="branding">
            <Accordion.Trigger>
              <AppearanceSectionLabel
                icon={<BadgeIcon />}
                title={<Trans message="Branding" />}
                description={
                  <Trans message="Control whether the Linket logo is shown." />
                }
              />
            </Accordion.Trigger>
            <Accordion.Content>
              <BrandingStyle />
            </Accordion.Content>
          </Accordion.Item>
        ) : null}
      </Accordion.Root>
    </div>
  );
}

function AppearanceSectionLabel({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: ReactNode;
  description: ReactNode;
}) {
  return (
    <span className="flex min-w-0 flex-1 items-start gap-3">
      <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span>{title}</span>
        <span className="text-xs font-normal text-muted-foreground">
          {description}
        </span>
      </span>
    </span>
  );
}

function TextStyle() {
  const updateAppearance = useBiolinkEditorStore(s => s.updateAppearance);
  const currentValue =
    useBiolinkEditorStore(s => s.appearance?.fontConfig) || BrowserSafeFonts[0];
  const bgConfig = useBiolinkEditorStore(s => s.appearance?.bgConfig);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="w-full">
        <div className="mb-2 text-sm font-medium">
          <Trans message="Font" />
        </div>
        <Dialog.Root>
          <Dialog.Trigger
            render={
              <Button
                variant="outline"
                className="w-full justify-between rounded-input"
              />
            }
          >
            {currentValue ? (
              <FontDisplayName font={currentValue} />
            ) : (
              <Trans message="System" />
            )}
            <ChevronDownIcon data-icon="inline-end" />
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Backdrop className="supports-backdrop-filter:backdrop-blur-none" />
            <Dialog.Content className="sm:max-w-xl">
              <Dialog.Header>
                <Dialog.Title>
                  <Trans message="Select a font" />
                </Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <CommonFontSelector
                  value={currentValue}
                  onChange={newValue => {
                    updateAppearance({
                      fontConfig: {
                        ...currentValue,
                        ...newValue,
                      },
                    });
                  }}
                />
              </Dialog.Body>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
      <ColorField
        className="w-full max-w-none"
        label={<Trans message="Color" />}
        value={bgConfig?.color || '#000'}
        onChange={newValue => {
          updateAppearance({
            bgConfig: {
              ...bgConfig!,
              color: newValue,
            },
          });
        }}
      />
    </div>
  );
}

function BrandingStyle() {
  const updateAppearance = useBiolinkEditorStore(s => s.updateAppearance);
  const {branding, biolink} = useSettings();
  const {isSubscribed} = useAuth();
  const {billing} = useSettings();
  const currentValue =
    useBiolinkEditorStore(s => s.appearance?.hideBranding) || false;

  if (!biolink?.show_branding) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      {billing?.enable && !isSubscribed && (
        <NoFeaturePermissionPopover.Root
          message={
            <Trans
              message="Upgrade to remove :site logo."
              values={{site: branding.site_name}}
            />
          }
        >
          <NoFeaturePermissionPopover.ButtonTrigger />
        </NoFeaturePermissionPopover.Root>
      )}

      <Switch
        disabled={!isSubscribed}
        checked={currentValue}
        onChange={e => {
          updateAppearance({
            hideBranding: e.target.checked,
          });
        }}
      >
        <Trans message="Hide :site logo" values={{site: branding.site_name}} />
      </Switch>
    </div>
  );
}
