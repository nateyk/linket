import {BackgroundStyle} from '@app/dashboard/biolink/biolink-editor/appearance/background-style';
import {ButtonStyle} from '@app/dashboard/biolink/biolink-editor/appearance/button-style';
import {appearanceHeaderClassnames} from '@app/dashboard/biolink/biolink-editor/appearance/header-classnames';
import {LayoutStyle} from '@app/dashboard/biolink/biolink-editor/appearance/layout-style';
import {useBiolinkEditorStore} from '@app/dashboard/biolink/biolink-editor/biolink-editor-store';
import {useAuth} from '@common/auth/use-auth';
import {NoFeaturePermissionPopover} from '@common/billing/upgrade/no-permission-button';
import {
  FontSelector as CommonFontSelector,
  FontDisplayName,
} from '@common/ui/font-selector/font-selector';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {ColorField} from '@ui/color-picker/color-field';
import {BrowserSafeFonts} from '@ui/fonts/font-picker/browser-safe-fonts';
import {Switch} from '@ui/forms/toggle/switch';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {ChevronDownIcon} from 'lucide-react';

export function Component() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-15">
      <BackgroundStyle />
      <ButtonStyle />
      <TextStyle />
      <LayoutStyle />
      <BrandingStyle />
    </div>
  );
}

function TextStyle() {
  const updateAppearance = useBiolinkEditorStore(s => s.updateAppearance);
  const currentValue =
    useBiolinkEditorStore(s => s.appearance?.fontConfig) || BrowserSafeFonts[0];
  const bgConfig = useBiolinkEditorStore(s => s.appearance?.bgConfig);

  return (
    <div>
      <h2 className={appearanceHeaderClassnames.h2}>
        <Trans message="Text" />
      </h2>
      <div className="flex items-center gap-3">
        <div className="w-full max-w-57">
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
          className="max-w-57"
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
    <div>
      <h2 className={appearanceHeaderClassnames.h2}>
        <Trans message="Branding" />
      </h2>

      {billing?.enable && !isSubscribed && (
        <NoFeaturePermissionPopover.Root
          message={
            <Trans
              message="Upgrade to remove :site logo."
              values={{site: branding.site_name}}
            />
          }
        >
          <NoFeaturePermissionPopover.ButtonTrigger className="mb-3.5" />
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
