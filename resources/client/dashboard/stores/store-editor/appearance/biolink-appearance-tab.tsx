import {BackgroundStyle} from '@app/dashboard/stores/store-editor/appearance/background-style';
import {StorefrontAiAppearancePreview} from './storefront-ai-appearance-preview';
import {ButtonStyle} from '@app/dashboard/stores/store-editor/appearance/button-style';
import {appearanceHeaderClassnames} from '@app/dashboard/stores/store-editor/appearance/header-classnames';
import {useBiolinkEditorStore} from '@app/dashboard/stores/store-editor/biolink-editor-store';
import {BuilderSectionHeader} from '@app/dashboard/stores/store-editor/builder-section-header';
import {
  BuilderCollapsible,
  BuilderCollapsibleContent,
} from '@app/dashboard/stores/store-editor/builder-collapsible';
import {SectionCollapsibleTrigger} from '@app/dashboard/stores/store-editor/section-accordion-trigger';
import {SectionHeading} from '@app/dashboard/stores/store-editor/section-heading';
import {useAuth} from '@common/auth/use-auth';
import {NoFeaturePermissionPopover} from '@common/billing/upgrade/no-permission-button';
import {
  FontSelector as CommonFontSelector,
  FontDisplayName,
} from '@common/ui/font-selector/font-selector';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {ColorField} from '@ui/color-picker/color-field';
import {
  BrowserSafeFonts,
  normalizeFontConfig,
} from '@ui/fonts/font-picker/browser-safe-fonts';
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
import {useState} from 'react';

export function Component() {
  const {biolink} = useSettings();
  // Match Content: one compact collapsible section open at a time.
  const [openSection, setOpenSection] = useState<string | null>(null);

  return (
    <div className="flex w-full flex-col gap-4">
      <SectionHeading
        title={<Trans message="Appearance" />}
        description={
          <Trans message="Customize your public storefront, products, and services." />
        }
      />
      <StorefrontAiAppearancePreview />
      <div className="flex w-full flex-col gap-3">
        <BuilderCollapsible
            open={openSection === 'background'}
            onOpenChange={open => setOpenSection(open ? 'background' : null)}
          >
          <SectionCollapsibleTrigger>
            <BuilderSectionHeader
              icon={ImageIcon}
              title={<Trans message="Background" />}
              description={
                <Trans message="Choose a color, gradient, pattern, or image." />
              }
            />
          </SectionCollapsibleTrigger>
          <BuilderCollapsibleContent>
            <BackgroundStyle />
          </BuilderCollapsibleContent>
        </BuilderCollapsible>

        <BuilderCollapsible
            open={openSection === 'buttons'}
            onOpenChange={open => setOpenSection(open ? 'buttons' : null)}
          >
          <SectionCollapsibleTrigger>
            <BuilderSectionHeader
              icon={MousePointerClickIcon}
              title={<Trans message="Buttons" />}
              description={
                <Trans message="Style storefront buttons and customer actions." />
              }
            />
          </SectionCollapsibleTrigger>
          <BuilderCollapsibleContent>
            <ButtonStyle />
          </BuilderCollapsibleContent>
        </BuilderCollapsible>

        <BuilderCollapsible
            open={openSection === 'text'}
            onOpenChange={open => setOpenSection(open ? 'text' : null)}
          >
          <SectionCollapsibleTrigger>
            <BuilderSectionHeader
              icon={TypeIcon}
              title={<Trans message="Text" />}
              description={
                <Trans message="Choose the storefront font and text color." />
              }
            />
          </SectionCollapsibleTrigger>
          <BuilderCollapsibleContent>
            <TextStyle />
          </BuilderCollapsibleContent>
        </BuilderCollapsible>

        {biolink?.show_branding ? (
          <BuilderCollapsible
            open={openSection === 'branding'}
            onOpenChange={open => setOpenSection(open ? 'branding' : null)}
          >
            <SectionCollapsibleTrigger>
              <BuilderSectionHeader
                icon={BadgeIcon}
                title={<Trans message="Branding" />}
                description={
                  <Trans message="Control whether the Linket logo is shown." />
                }
              />
            </SectionCollapsibleTrigger>
            <BuilderCollapsibleContent>
              <BrandingStyle />
            </BuilderCollapsibleContent>
          </BuilderCollapsible>
        ) : null}
      </div>
    </div>
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
        <div className={appearanceHeaderClassnames.h3}>
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
                      fontConfig: normalizeFontConfig(newValue),
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
