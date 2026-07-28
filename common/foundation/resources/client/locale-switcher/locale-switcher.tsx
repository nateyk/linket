import {useChangeLocale} from '@common/locale-switcher/change-locale';
import {Button} from '@shadcn/button/button';
import {useBootstrapDataStore} from '@ui/bootstrap-data/bootstrap-data-store';
import {useSelectedLocale} from '@ui/i18n/selected-locale';
import {Menu, MenuItem, MenuTrigger} from '@ui/menu/menu-trigger';
import {useSettings} from '@ui/settings/use-settings';
import {ChevronDownIcon, GlobeIcon} from 'lucide-react';

export function LocaleSwitcher() {
  const {localeCode, localeName} = useSelectedLocale();
  const changeLocale = useChangeLocale();
  const siteLocales = useBootstrapDataStore(s => s.data.i18n.locales);
  const {i18n} = useSettings();

  if (!siteLocales || !localeCode || !i18n.enable) return null;

  return (
    <MenuTrigger
      floatingWidth="matchTrigger"
      selectionMode="single"
      selectedValue={localeCode}
      onSelectionChange={value => {
        const newLocale = value as string;
        if (newLocale !== localeCode) {
          changeLocale.mutate({locale: newLocale});
        }
      }}
    >
      <Button disabled={changeLocale.isPending} variant="ghost">
        <GlobeIcon />
        {localeName}
        <ChevronDownIcon data-icon="inline-end" />
      </Button>
      <Menu>
        {siteLocales.map(locale => (
          <MenuItem
            value={locale.language}
            key={locale.language}
            className="capitalize"
          >
            {locale.name}
          </MenuItem>
        ))}
      </Menu>
    </MenuTrigger>
  );
}
