import {AdminDocsUrls} from '@app/admin/admin-config';
import {AdminSettings} from '@common/admin/settings/admin-settings';
import {SettingsErrorGroup} from '@common/admin/settings/layout/settings-error-group';
import {AdminSettingsLayout} from '@common/admin/settings/layout/settings-layout';
import {DocsLink} from '@common/admin/settings/layout/settings-links';
import {SettingsPanel} from '@common/admin/settings/layout/settings-panel';
import {
  getSearchableModelsOptions,
  importRecordsIntoScoutOptions,
} from '@common/admin/settings/settings-queries';
import {useAdminSettings} from '@common/admin/settings/use-admin-settings';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {Alert} from '@shadcn/alert/alert';
import {Button} from '@shadcn/button/button';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Select} from '@shadcn/forms/select/select';
import {toast} from '@shadcn/toast/toast';
import {useMutation, useSuspenseQuery} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {TriangleAlertIcon} from 'lucide-react';
import {ReactNode, useMemo, useState} from 'react';
import {useForm, useFormContext, useWatch} from 'react-hook-form';

const scoutDriverOptions = [
  {value: 'mysql', label: <Trans message="Database (Default)" />},
  {value: 'meilisearch', label: <Trans message="Meilisearch (Recommended)" />},
  {value: 'tntsearch', label: <Trans message="TNTSearch" />},
] as const;

const mysqlModeOptions = [
  {value: 'basic', label: <Trans message="Basic" />},
  {value: 'extended', label: <Trans message="Extended" />},
  {value: 'fulltext', label: <Trans message="Fulltext" />},
] as const;

export function Component() {
  const {data} = useAdminSettings();
  const form = useForm<AdminSettings>({
    defaultValues: {
      server: {
        scout_driver: data.server.scout_driver ?? 'mysql',
        scout_mysql_mode: data.server.scout_mysql_mode ?? 'basic',
      },
    },
  });

  return (
    <AdminSettingsLayout form={form} title={<Trans message="Search" />}>
      <div className="flex flex-col gap-6">
        <SearchMethodSection />
        <ImportRecordsPanel />
      </div>
    </AdminSettingsLayout>
  );
}

function SearchMethodSection() {
  const selectedMethod = useWatch<AdminSettings>({name: 'server.scout_driver'});

  return (
    <SettingsPanel
      title={<Trans message="Search Method" />}
      description={
        <div>
          <Trans message="Configure which search method should be used for search functionality across your site." />
        </div>
      }
      link={
        AdminDocsUrls.settings.search ? (
          <DocsLink link={AdminDocsUrls.settings.search}>
            <Trans message="What's the difference between the search methods?" />
          </DocsLink>
        ) : null
      }
    >
      <SettingsErrorGroup
        name="search_group"
        separatorBottom={false}
        separatorTop={false}
      >
        {isInvalid => (
          <Field.Group>
            <HookForm.Field name="server.scout_driver" invalid={isInvalid}>
              <Field.Label>
                <Trans message="Search method" />
              </Field.Label>
              <Select.Root items={scoutDriverOptions}>
                <Select.Trigger className="w-full">
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  {scoutDriverOptions.map(option => (
                    <Select.Item key={option.value} value={option.value}>
                      {option.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
              <Field.Error />
            </HookForm.Field>
            {selectedMethod === 'mysql' && <MysqlFields />}
            {selectedMethod === 'meilisearch' && <MeilisearchFields />}
          </Field.Group>
        )}
      </SettingsErrorGroup>
    </SettingsPanel>
  );
}

function MysqlFields() {
  const {clearErrors} = useFormContext<AdminSettings>();
  return (
    <HookForm.Field name="server.scout_mysql_mode">
      <Field.Label>
        <Trans message="Database search mode" />
      </Field.Label>
      <Select.Root
        items={mysqlModeOptions}
        onValueChange={() => {
          clearErrors();
        }}
      >
        <Select.Trigger className="w-full">
          <Select.Value />
        </Select.Trigger>
        <Select.Content>
          {mysqlModeOptions.map(option => (
            <Select.Item key={option.value} value={option.value}>
              {option.label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
      <Field.Error />
    </HookForm.Field>
  );
}

function MeilisearchFields() {
  return (
    <Alert.Root>
      <TriangleAlertIcon />
      <Alert.Description>
        <Trans
          message="<a>Meilisearch</a> needs to be installed and running for this method to work."
          values={{
            a: parts => (
              <a
                href="https://www.meilisearch.com"
                target="_blank"
                rel="noreferrer"
              >
                {parts}
              </a>
            ),
          }}
        />
      </Alert.Description>
    </Alert.Root>
  );
}

function ImportRecordsPanel() {
  const {getValues} = useFormContext<AdminSettings>();
  const {data} = useSuspenseQuery(getSearchableModelsOptions());
  const importModels = useMutation({
    ...importRecordsIntoScoutOptions(),
    onSuccess: () => {
      toast.success(<Trans message="Imported search models" />);
    },
    onError: err => showHttpErrorToast(err),
  });
  const [selectedModel, setSelectedModel] = useState('*');

  const importOptions = useMemo(() => {
    const options: {value: string; label: ReactNode}[] = [
      {value: '*', label: <Trans message="Everything" />},
    ];
    data?.models.forEach(item => {
      options.push({
        value: item.model,
        label: <Trans message={item.name} />,
      });
    });
    return options;
  }, [data]);

  return (
    <SettingsPanel
      title={<Trans message="Import Records" />}
      description={
        <div className="flex flex-col gap-1.5">
          <p>
            <Trans message="After changing search method, database records need to be imported into the search index." />
          </p>
          <p>
            <Trans message="Depending on number of records in database, importing could take some time. Don't close this window while it is in progress." />
          </p>
        </div>
      }
    >
      <div className="flex flex-col items-start gap-3">
        <Field.Root className="w-full max-w-md">
          <Field.Label>
            <Trans message="What to import?" />
          </Field.Label>
          <Select.Root
            items={importOptions}
            value={selectedModel}
            onValueChange={value => {
              setSelectedModel(value as string);
            }}
          >
            <Select.Trigger className="w-full">
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              {importOptions.map(option => (
                <Select.Item key={option.value} value={option.value}>
                  {option.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </Field.Root>
        <Button
          size="sm"
          variant="outline"
          color="primary"
          disabled={importModels.isPending}
          onClick={() => {
            importModels.mutate({
              model: selectedModel,
              driver: getValues('server.scout_driver')!,
            });
          }}
        >
          <Trans message="Import now" />
        </Button>
      </div>
    </SettingsPanel>
  );
}
