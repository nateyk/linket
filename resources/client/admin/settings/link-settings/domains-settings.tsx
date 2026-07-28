import {listDomainsOptions} from '@app/dashboard/custom-domains/domains-queries';
import {AdminSettings} from '@common/admin/settings/admin-settings';
import {AdminSettingsLayout} from '@common/admin/settings/layout/settings-layout';
import {SettingsPanel} from '@common/admin/settings/layout/settings-panel';
import {useAdminSettings} from '@common/admin/settings/use-admin-settings';
import {RemoteFavicon} from '@common/ui/other/remote-favicon';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Select} from '@shadcn/forms/select/select';
import {Switch} from '@shadcn/forms/switch/switch';
import {useQuery} from '@tanstack/react-query';
import {MessageDescriptor} from '@ui/i18n/message-descriptor';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {removeProtocol} from '@ui/utils/urls/remove-protocol';
import {ReactElement} from 'react';
import {useForm} from 'react-hook-form';

type Props = {
  tabs: ReactElement;
  title: ReactElement<MessageDescriptor>;
};

export function DomainsSettings({tabs, title}: Props) {
  const {data} = useAdminSettings();
  const form = useForm<AdminSettings>({
    defaultValues: {
      client: {
        custom_domains: {
          allow_select: data.client.custom_domains?.allow_select ?? true,
          allow_all_option:
            data.client.custom_domains?.allow_all_option ?? true,
          default_host: data.client.custom_domains?.default_host,
        },
        links: {
          subdomain_matching: data.client.links?.subdomain_matching ?? true,
        },
      },
    },
  });
  return (
    <AdminSettingsLayout form={form} title={title} tabs={tabs}>
      <div className="flex flex-col gap-6">
        <DefaultDomainPanel />
        <DomainSelectionPanel />
        <LinkAccessPanel />
        <SubdomainLinkMatchingPanel />
      </div>
    </AdminSettingsLayout>
  );
}

function DefaultDomainPanel() {
  const {data} = useQuery(listDomainsOptions('admin'));
  const {base_url} = useSettings();

  const domains = data?.data ?? [];
  const domainOptions = [
    {
      value: '',
      label: (
        <>
          <RemoteFavicon url={base_url} />
          {removeProtocol(base_url)}
        </>
      ),
    },
    ...domains.map(domain => ({
      value: domain.host,
      label: (
        <>
          <RemoteFavicon url={domain.host} />
          {removeProtocol(domain.host)}
        </>
      ),
    })),
  ];

  return (
    <SettingsPanel
      title={<Trans message="Default domain" />}
      description={
        <Trans message="Which domain should be used by default when shortening links." />
      }
    >
      <HookForm.Field name="client.custom_domains.default_host">
        <Select.Root items={domainOptions}>
          <Select.Trigger className="w-full">
            <Select.Value />
          </Select.Trigger>
          <Select.Content>
            {domainOptions.map(domain => (
              <Select.Item value={domain.value} key={domain.value}>
                {domain.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
        <Field.Error />
      </HookForm.Field>
    </SettingsPanel>
  );
}

function DomainSelectionPanel() {
  return (
    <SettingsPanel
      title={<Trans message="Domain selection" />}
      description={
        <Trans message="Allow users to manually select which domain to use when shortening links (if there are multiple domains)." />
      }
    >
      <HookForm.Field name="client.custom_domains.allow_select">
        <Field.Label>
          <Switch />
          <Trans message="Allow domain selection" />
        </Field.Label>
      </HookForm.Field>
    </SettingsPanel>
  );
}

function LinkAccessPanel() {
  return (
    <SettingsPanel
      title={<Trans message="Link access" />}
      description={
        <Trans message="Allow short links to be accessible via all domains user has access to. With this option off, short links will only be accessible via default domain selected above, or domain user selected when shortening a link." />
      }
    >
      <HookForm.Field name="client.custom_domains.allow_all_option">
        <Field.Label>
          <Switch />
          <Trans message="Allow accessing links via multiple domains" />
        </Field.Label>
      </HookForm.Field>
    </SettingsPanel>
  );
}

function SubdomainLinkMatchingPanel() {
  return (
    <SettingsPanel
      title={<Trans message="Subdomain link matching" />}
      description={
        <Trans message="When enabled, both “back-half.site.com“ and “site.com/back-half“ urls will be accessible." />
      }
    >
      <HookForm.Field name="client.links.subdomain_matching">
        <Field.Label>
          <Switch />
          <Trans message="Allow subdomain link matching" />
        </Field.Label>
      </HookForm.Field>
    </SettingsPanel>
  );
}
