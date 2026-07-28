import {Combobox} from '@shadcn/forms/combobox/combobox';
import {VirtualizedCombobox} from '@shadcn/forms/combobox/virtualized-combobox';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {getTimeZoneGroups} from '@ui/utils/intl/timezones';
import {ReactNode, useMemo, useRef, useState} from 'react';

type TimezoneItem = {
  label: ReactNode;
  value: string;
};

export function TimezoneSelect({extraItems}: {extraItems?: TimezoneItem[]}) {
  const {trans} = useTrans();
  const virtualizerRef = useRef<VirtualizedCombobox.Virtualizer | null>(null);
  const items = useMemo(() => {
    const items: TimezoneItem[] = Object.values(getTimeZoneGroups())
      .flat()
      .map(timezone => ({label: timezone, value: timezone}));
    if (extraItems) {
      items.unshift(...extraItems);
    }
    return items;
  }, [extraItems]);

  const [open, setOpen] = useState(false);

  return (
    <VirtualizedCombobox.Root
      items={items}
      open={open}
      onOpenChange={setOpen}
      virtualizerRef={virtualizerRef}
    >
      <Combobox.ButtonTrigger
        placeholder={<Trans message="Select timezone" />}
      />
      <Combobox.Content className="w-sm">
        <Combobox.InsetInput placeholder={trans(message('Search timezones'))} />
        <Combobox.Empty>
          <Trans message="No timezones found." />
        </Combobox.Empty>
        <VirtualizedCombobox.List
          enabled={open}
          virtualizerRef={virtualizerRef}
        >
          {(item: Combobox.GenericItem) => (
            <Combobox.Item key={item.value} value={item.value}>
              {item.label}
            </Combobox.Item>
          )}
        </VirtualizedCombobox.List>
      </Combobox.Content>
    </VirtualizedCombobox.Root>
  );
}
