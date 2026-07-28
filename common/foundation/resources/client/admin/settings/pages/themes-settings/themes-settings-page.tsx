import {AdminDocsUrls} from '@app/admin/admin-config';
import {AdminSettings} from '@common/admin/settings/admin-settings';
import {useSettingsPageStore} from '@common/admin/settings/layout/settings-page-store';
import {SettingsWithPreview} from '@common/admin/settings/layout/settings-with-preview';
import {CreateNewThemeButton} from '@common/admin/settings/pages/themes-settings/create-new-theme-button';
import {SelectThemeButton} from '@common/admin/settings/pages/themes-settings/select-theme-button';
import {ThemeColorButton} from '@common/admin/settings/pages/themes-settings/theme-color-button';
import {themeColorList} from '@common/admin/settings/pages/themes-settings/theme-constants';
import {ThemeOptionsButton} from '@common/admin/settings/pages/themes-settings/theme-options-button';
import {useAdminSettings} from '@common/admin/settings/use-admin-settings';
import {ColorSchemeContext} from '@common/core/color-scheme-provider';
import {
  FontDisplayName,
  FontSelector,
} from '@common/ui/font-selector/font-selector';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Select} from '@shadcn/forms/select/select';
import {Switch} from '@shadcn/forms/switch/switch';
import {Separator} from '@shadcn/separator';
import {getBootstrapData} from '@ui/bootstrap-data/bootstrap-data-store';
import {BrowserSafeFonts} from '@ui/fonts/font-picker/browser-safe-fonts';
import {Trans} from '@ui/i18n/trans';
import {CssTheme} from '@ui/themes/css-theme';
import {cn} from '@ui/utils/cn';
import {ChevronDownIcon} from 'lucide-react';
import {use, useState} from 'react';
import {useForm, useFormContext, useWatch} from 'react-hook-form';

const defaultSchemeOptions = [
  {value: 'system', label: <Trans message="System" />},
  {value: 'light', label: <Trans message="Light" />},
  {value: 'dark', label: <Trans message="Dark" />},
] as const;

export function Component() {
  const {data} = useAdminSettings();
  const siteThemes = data.themes.filter(t => t.type === 'site');

  const form = useForm<AdminSettings>({
    defaultValues: {
      themes: siteThemes,
      client: {
        themes: {
          default_scheme: data.client.themes?.default_scheme ?? 'system',
          user_change: data.client.themes?.user_change ?? false,
        },
      },
    },
  });

  return (
    <SettingsWithPreview
      title={<Trans message="Themes" />}
      defaultRoute={getBootstrapData().auth_redirect_uri ?? '/'}
      docsLink={AdminDocsUrls.settings.themes}
    >
      <SettingsWithPreview.Content>
        <SettingsWithPreview.Form form={form}>
          <div className="flex flex-col gap-5">
            <HookForm.Field name="client.themes.default_scheme">
              <Field.Label>
                <Trans message="Default color scheme" />
              </Field.Label>
              <Select.Root items={defaultSchemeOptions}>
                <Select.Trigger>
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  {defaultSchemeOptions.map(option => (
                    <Select.Item key={option.value} value={option.value}>
                      {option.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
              <Field.Error />
            </HookForm.Field>

            <HookForm.Field name="client.themes.user_change">
              <Field.Label>
                <Switch />
                <Trans message="Allow users to switch color scheme" />
              </Field.Label>
            </HookForm.Field>

            <Separator />

            <ThemeEditor />
          </div>
        </SettingsWithPreview.Form>
      </SettingsWithPreview.Content>
      <SettingsWithPreview.Preview />
    </SettingsWithPreview>
  );
}

interface ThemeEditorProps {
  size?: 'sm' | 'lg';
  type?: string;
}
export function ThemeEditor({size = 'lg', type = 'site'}: ThemeEditorProps) {
  const preview = useSettingsPageStore(s => s.preview);
  const form = useFormContext<AdminSettings>();
  const allThemes = useWatch<AdminSettings, 'themes'>({name: 'themes'}).filter(
    t => t.type === type,
  );
  const {colorScheme} = use(ColorSchemeContext);
  const [selectedThemeId, setSelectedThemeId] = useState(() => {
    const initialTheme = allThemes.find(t =>
      colorScheme === 'dark' ? t.default_dark : t.default_light,
    );
    return initialTheme ? initialTheme.id : allThemes[0]!.id;
  });
  const selectedTheme = form
    .watch('themes')
    .find(t => t.id === selectedThemeId);

  const setSelectedTheme = (themeId: number) => {
    if (themeId === selectedThemeId) return;
    setSelectedThemeId(themeId);
    const theme = form.getValues('themes').find(t => t.id === themeId);
    if (theme) {
      preview.setActiveTheme(theme);
    }
  };

  const selectedThemeIndex = form
    .watch('themes')
    .findIndex(t => t.id === selectedThemeId);

  return (
    <>
      <div className="flex items-center gap-2">
        <SelectThemeButton
          selectedThemeId={selectedThemeId}
          onSelectionChange={setSelectedTheme}
          allThemes={allThemes}
        />

        <ThemeOptionsButton
          selectedThemeId={selectedThemeId}
          onSelectedThemeChange={setSelectedTheme}
        />

        <CreateNewThemeButton type={type} onCreated={setSelectedTheme} />
      </div>
      <div className="flex flex-col gap-3">
        <ThemeFontDialog themeId={selectedThemeId} size={size} />
        <ThemeRoundnessSelect themeIndex={selectedThemeIndex} size={size} />

        <div className="flex flex-col gap-3">
          <Field.Title>
            <Trans message="Colors" />
          </Field.Title>
          {themeColorList.map(color => (
            <ThemeColorButton
              key={color.key}
              colorName={color.key}
              size={size}
              label={color.label}
              initialThemeValue={selectedTheme?.values[color.key] ?? ''}
            />
          ))}
        </div>
      </div>
    </>
  );
}

interface ThemeFontDialogProps {
  themeId: number;
  size?: 'sm' | 'lg';
}
function ThemeFontDialog({themeId, size = 'lg'}: ThemeFontDialogProps) {
  const preview = useSettingsPageStore(s => s.preview);
  const {setValue, watch} = useFormContext<AdminSettings>();
  const selectedThemeIndex = watch('themes').findIndex(t => t.id === themeId);
  const key = `themes.${selectedThemeIndex}.font` as 'themes.1.font';
  const font = watch(key) ?? BrowserSafeFonts[0]!;

  return (
    <div>
      <Field.Title className="mb-2">
        <Trans message="Font" />
      </Field.Title>
      <Dialog.Root>
        <Dialog.Trigger
          render={
            <Button
              variant="outline"
              size={size}
              className="w-full justify-between"
            />
          }
        >
          <FontDisplayName font={font} />
          <ChevronDownIcon data-icon="inline-end" />
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Backdrop className="supports-backdrop-filter:backdrop-blur-none" />
          <Dialog.Content className="sm:max-w-lg">
            <Dialog.Header>
              <Dialog.Title>
                <Trans message="Font" />
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <FontSelector
                value={watch(key)}
                onChange={font => {
                  setValue(key, font, {shouldDirty: true});
                  preview.setThemeFont(font);
                }}
              />
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

const roundnessOptions = [
  {
    value: 'none',
    label: (
      <>
        <RoundnessPreview d="M4 20V4H20" />
        <Trans message="Square" />
      </>
    ),
  },
  {
    value: 'sm',
    label: (
      <>
        <RoundnessPreview d="M4 20V8C4 5.79086 5.79086 4 8 4H20" />
        <Trans message="Round" />
      </>
    ),
  },
  {
    value: 'md',
    label: (
      <>
        <RoundnessPreview d="M4 20V12C4 7.58172 7.58172 4 12 4H20" />
        <Trans message="Rounder" />
      </>
    ),
  },
  {
    value: 'default',
    label: (
      <>
        <RoundnessPreview d="M4 20C4 11.1634 11.1634 4 20 4" />
        <Trans message="Full" />
      </>
    ),
  },
] as const;

function RoundnessPreview({d}: {d: string}) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d={d}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface ThemeRoundnessSelectProps {
  themeIndex: number;
  size?: 'sm' | 'lg';
}
function ThemeRoundnessSelect({
  themeIndex,
  size = 'lg',
}: ThemeRoundnessSelectProps) {
  const preview = useSettingsPageStore(s => s.preview);

  return (
    <HookForm.Field name={`themes.${themeIndex}.radius`}>
      <Field.Label>
        <Trans message="Corner roundness" />
      </Field.Label>
      <Select.Root
        items={roundnessOptions}
        onValueChange={value => {
          preview.setThemeRadius(value as NonNullable<CssTheme['radius']>);
        }}
      >
        <Select.Trigger
          className={cn(
            'w-full rounded-button font-medium',
            size === 'lg' ? 'h-10' : 'h-9',
          )}
        >
          <Select.Value />
        </Select.Trigger>
        <Select.Content>
          {roundnessOptions.map(option => (
            <Select.Item key={option.value} value={option.value}>
              {option.label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    </HookForm.Field>
  );
}
