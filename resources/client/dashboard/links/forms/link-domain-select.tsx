import {listDomainsOptions} from '@app/dashboard/custom-domains/domains-queries';
import {useDefaultCustomDomainHost} from '@app/dashboard/custom-domains/use-default-custom-domain-host';
import {useDatatableRouteType} from '@app/dashboard/use-datatable-route-type';
import {RemoteFavicon} from '@common/ui/other/remote-favicon';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Select} from '@shadcn/forms/select/select';
import {useQuery} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {removeProtocol} from '@ui/utils/urls/remove-protocol';
import {ReactNode, useMemo} from 'react';

type Props = {
  name: string;
  className?: string;
  label?: ReactNode;
  disabled?: boolean;
};
export function LinkDomainSelect({name, className, label, disabled}: Props) {
  const {routeType} = useDatatableRouteType();
  const {data} = useQuery(listDomainsOptions(routeType));
  const defaultHost = useDefaultCustomDomainHost();
  const {custom_domains} = useSettings();
  const isDisabled = disabled || !custom_domains?.allow_select;

  const selectItems = useMemo(() => {
    const items = [];
    if (custom_domains?.allow_all_option) {
      items.push({
        value: null,
        host: null,
        label: <Trans message="All my domains (including default)" />,
      });
    }
    items.push({
      value: 0,
      host: defaultHost,
      label: removeProtocol(defaultHost),
    });
    data?.data?.forEach(domain => {
      if (domain.host === defaultHost) return;
      items.push({
        value: domain.id,
        host: domain.host,
        label: removeProtocol(domain.host),
      });
    });
    return items;
  }, [custom_domains, defaultHost, data?.data]);

  return (
    <HookForm.Field name={name} className={className}>
      {label && <Field.Label>{label}</Field.Label>}
      <Select.Root disabled={isDisabled} items={selectItems}>
        <Select.Trigger>
          <Select.Value />
        </Select.Trigger>
        <Select.Content>
          {selectItems.map(item => (
            <Select.Item value={item.value} key={item.value}>
              {item.host && <RemoteFavicon url={item.host} />}
              {item.label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
      <Field.Error />
    </HookForm.Field>
  );
}
