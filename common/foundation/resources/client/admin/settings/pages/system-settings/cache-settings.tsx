import {AdminDocsUrls} from '@app/admin/admin-config';
import {AdminSettings} from '@common/admin/settings/admin-settings';
import {SettingsErrorGroup} from '@common/admin/settings/layout/settings-error-group';
import {AdminSettingsLayout} from '@common/admin/settings/layout/settings-layout';
import {DocsLink} from '@common/admin/settings/layout/settings-links';
import {SettingsPanel} from '@common/admin/settings/layout/settings-panel';
import {flushCacheOptions} from '@common/admin/settings/settings-queries';
import {useAdminSettings} from '@common/admin/settings/use-admin-settings';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {Alert} from '@shadcn/alert/alert';
import {Button} from '@shadcn/button/button';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput,
} from '@shadcn/forms/number-field/number-field';
import {Select} from '@shadcn/forms/select/select';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {MessageDescriptor} from '@ui/i18n/message-descriptor';
import {Trans} from '@ui/i18n/trans';
import {ComponentType, Fragment, ReactElement} from 'react';
import {useForm, useFormContext} from 'react-hook-form';

const cacheStoreOptions = [
  {value: 'file', label: <Trans message="File (Default)" />},
  {value: 'array', label: <Trans message="None" />},
  {value: 'apc', label: 'APC'},
  {value: 'memcached', label: 'Memcached'},
  {value: 'redis', label: 'Redis'},
] as const;

interface Props {
  tabs: ReactElement;
  title: ReactElement<MessageDescriptor>;
}
export function CacheSettings({tabs, title}: Props) {
  const {data} = useAdminSettings();
  const form = useForm<AdminSettings>({
    defaultValues: {
      server: {
        cache_store: data.server.cache_store ?? 'file',
        memcached_host: data.server.memcached_host ?? '',
        memcached_port: data.server.memcached_port ?? '',
      },
    },
  });
  return (
    <AdminSettingsLayout form={form} title={title} tabs={tabs}>
      <CacheProviderPanel />
      <ClearCachePanel />
    </AdminSettingsLayout>
  );
}

export function CacheProviderPanel() {
  return (
    <SettingsPanel
      className="mb-6"
      title={<Trans message="Cache Provider" />}
      description={
        <Trans message="Configure which method should be used for storing and retrieving cached items." />
      }
      link={
        AdminDocsUrls.settings.cache ? (
          <DocsLink link={AdminDocsUrls.settings.cache} />
        ) : undefined
      }
    >
      <CacheSelect />
      <Alert.Root className="mt-3" variant="warning" fillStyle="subtleFill">
        <Alert.Description className="text-xs">
          <Trans message='"File" is a good default, but other providers can provide better peformance, however they require extra setup on the server.' />
        </Alert.Description>
      </Alert.Root>
    </SettingsPanel>
  );
}

export function ClearCachePanel() {
  const clearCache = useMutation({
    ...flushCacheOptions(),
    onSuccess: () => {
      toast.success(<Trans message="Cache cleared" />);
    },
    onError: err => showHttpErrorToast(err),
  });

  return (
    <SettingsPanel
      title={<Trans message="Clear Cache" />}
      description={
        <Trans message="Clear application cache if you're experiencing issues with stale data." />
      }
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        color="primary"
        disabled={clearCache.isPending}
        onClick={() => clearCache.mutate()}
      >
        <Trans message="Clear cache" />
      </Button>
    </SettingsPanel>
  );
}

function CacheSelect() {
  const {watch, clearErrors} = useFormContext<AdminSettings>();
  const cacheStore = watch('server.cache_store');

  let CredentialSection: ComponentType<CredentialProps> | null = null;
  if (cacheStore === 'memcached') {
    CredentialSection = MemcachedCredentials;
  }

  return (
    <SettingsErrorGroup
      separatorTop={false}
      separatorBottom={false}
      name="cache_group"
    >
      {isInvalid => (
        <Fragment>
          <HookForm.Field invalid={isInvalid} name="server.cache_store">
            <Select.Root
              items={cacheStoreOptions}
              onValueChange={() => clearErrors()}
            >
              <Select.Trigger className="w-full">
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                {cacheStoreOptions.map(option => (
                  <Select.Item key={option.value} value={option.value}>
                    {option.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
            <Field.Error />
          </HookForm.Field>
          {CredentialSection && (
            <div className="mt-5">
              <CredentialSection isInvalid={isInvalid} />
            </div>
          )}
        </Fragment>
      )}
    </SettingsErrorGroup>
  );
}

interface CredentialProps {
  isInvalid: boolean;
}
function MemcachedCredentials({isInvalid}: CredentialProps) {
  return (
    <Field.Group>
      <HookForm.Field invalid={isInvalid} name="server.memcached_host">
        <Field.Label>
          <Trans message="Memcached host" />
        </Field.Label>
        <Input required />
        <Field.Error />
      </HookForm.Field>
      <HookForm.Field invalid={isInvalid} name="server.memcached_port">
        <Field.Label>
          <Trans message="Memcached port" />
        </Field.Label>
        <NumberField min={1} max={65535}>
          <NumberFieldDecrement />
          <NumberFieldInput />
          <NumberFieldIncrement />
        </NumberField>
        <Field.Error />
      </HookForm.Field>
    </Field.Group>
  );
}
