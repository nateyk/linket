import {Component as CommonLandingPageSettings} from '@common/admin/settings/landing-page-settings/landing-page-settings';
import {
  LandingPageSettingsContext,
  LandingPageSettingsContextValue,
} from '@common/admin/settings/landing-page-settings/landing-page-settings-context';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Switch} from '@shadcn/forms/switch/switch';
import {Trans} from '@ui/i18n/trans';

const contextValue: LandingPageSettingsContextValue = {
  customSections: {
    stats: {
      label: <Trans message="Statistics" />,
      component: StatsSettings,
    },
  },
  heroSettings: HeroSettings,
};

export function Component() {
  return (
    <LandingPageSettingsContext.Provider value={contextValue}>
      <CommonLandingPageSettings />
    </LandingPageSettingsContext.Provider>
  );
}

function StatsSettings() {
  return (
    <div>
      <Trans message="Show global statistics on landing page." />
    </div>
  );
}

function HeroSettings({formPrefix}: {formPrefix: string}) {
  return (
    <HookForm.Field name={`${formPrefix}.showSearchBarSlot`}>
      <Field.Label>
        <Switch />
        <Trans message="Show shorten link bar" />
      </Field.Label>
      <Field.Error />
    </HookForm.Field>
  );
}
