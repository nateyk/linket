import {AdminSettings} from '@common/admin/settings/admin-settings';
import {AdminSettingsLayout} from '@common/admin/settings/layout/settings-layout';
import {SettingsPanel} from '@common/admin/settings/layout/settings-panel';
import {useAdminSettings} from '@common/admin/settings/use-admin-settings';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {LinkStyle} from '@ui/buttons/external-link';
import {MessageDescriptor} from '@ui/i18n/message-descriptor';
import {Trans} from '@ui/i18n/trans';
import {ReactElement} from 'react';
import {useForm} from 'react-hook-form';

interface Props {
  tabs: ReactElement;
  title: ReactElement<MessageDescriptor>;
}
export function SecuritySettings({tabs, title}: Props) {
  const {data} = useAdminSettings();
  const form = useForm<AdminSettings>({
    defaultValues: {
      client: {
        links: {
          blacklist: {
            keywords: data.client.links?.blacklist?.keywords,
            domains: data.client.links?.blacklist?.domains,
          },
          phishtank_key: data.client.links?.phishtank_key,
          subdomain_matching: data.client.links?.subdomain_matching ?? true,
        },
      },
      server: {
        google_safe_browsing_key: data.server.google_safe_browsing_key,
      },
    },
  });
  return (
    <AdminSettingsLayout form={form} title={title} tabs={tabs}>
      <div className="flex flex-col gap-6">
        <KeywordBlacklistSection />
        <DomainBlacklistSection />
        <SafeBrowsingSection />
        <PhishtankSection />
      </div>
    </AdminSettingsLayout>
  );
}

export function KeywordBlacklistSection() {
  return (
    <SettingsPanel
      title={<Trans message="Keyword blacklist" />}
      description={
        <Trans message="Comma separated list of keywords. User will not be able to shorten any URLs that contain specified keywords." />
      }
    >
      <HookForm.Field name="client.links.blacklist.keywords">
        <Textarea rows={3} placeholder="keyword1, keyword2" />
        <Field.Error />
      </HookForm.Field>
    </SettingsPanel>
  );
}

export function DomainBlacklistSection() {
  return (
    <SettingsPanel
      title={<Trans message="Domain blacklist" />}
      description={
        <Trans message="Comma separated domain list. User will not be able to shorten any URLs from specified domains." />
      }
    >
      <HookForm.Field name="client.links.blacklist.domains">
        <Textarea rows={3} placeholder="domain1.com, domain2.com" />
        <Field.Error />
      </HookForm.Field>
    </SettingsPanel>
  );
}

export function SafeBrowsingSection() {
  return (
    <SettingsPanel
      title={<Trans message="Google safe browsing" />}
      description={
        <Trans
          message="<a>Google safe browsing</a> will prevent urls that are considered unsafe by google from being shortened. It is recommended to use this in order to prevent the site from being marked as deceptive."
          values={{
            a: parts => (
              <a
                className={LinkStyle}
                href="https://safebrowsing.google.com"
                target="_blank"
                rel="noreferrer"
              >
                {parts}
              </a>
            ),
          }}
        />
      }
    >
      <HookForm.Field name="server.google_safe_browsing_key">
        <Field.Label>
          <Trans message="Google safe browsing API key" />
        </Field.Label>
        <Input />
        <Field.Error />
      </HookForm.Field>
    </SettingsPanel>
  );
}

export function PhishtankSection() {
  return (
    <SettingsPanel
      title={<Trans message="Phishtank" />}
      description={
        <Trans
          message="Works the same way as google safe browsing service, but uses <a>Phishtank</a> instead."
          values={{
            a: parts => (
              <a
                className={LinkStyle}
                href="https://phishtank.org"
                target="_blank"
                rel="noreferrer"
              >
                {parts}
              </a>
            ),
          }}
        />
      }
    >
      <HookForm.Field name="client.links.phishtank_key">
        <Field.Label>
          <Trans message="Phishtank API key" />
        </Field.Label>
        <Input />
        <Field.Error />
      </HookForm.Field>
    </SettingsPanel>
  );
}
