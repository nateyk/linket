import {Select} from '@shadcn/forms/select/select';
import {useBootstrapDataStore} from '@ui/bootstrap-data/bootstrap-data-store';
import {Trans} from '@ui/i18n/trans';

export function LanguageSelect() {
  const locales = useBootstrapDataStore(s => s.data.i18n.locales);

  const items = locales.map(locale => ({
    label: locale.name,
    value: locale.language,
  }));

  return (
    <Select.Root items={items}>
      <Select.Trigger>
        <Select.Value placeholder={<Trans message="Select language" />} />
      </Select.Trigger>
      <Select.Content>
        {items.map(item => (
          <Select.Item key={item.value} value={item.value}>
            {item.label}
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  );
}
