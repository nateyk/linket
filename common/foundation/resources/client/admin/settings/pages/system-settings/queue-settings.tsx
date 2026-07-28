import {AdminDocsUrls} from '@app/admin/admin-config';
import {AdminSettings} from '@common/admin/settings/admin-settings';
import {SettingsErrorGroup} from '@common/admin/settings/layout/settings-error-group';
import {AdminSettingsLayout} from '@common/admin/settings/layout/settings-layout';
import {DocsLink} from '@common/admin/settings/layout/settings-links';
import {SettingsPanel} from '@common/admin/settings/layout/settings-panel';
import {useAdminSettings} from '@common/admin/settings/use-admin-settings';
import {apiClient} from '@common/http/query-client';
import {Alert} from '@shadcn/alert/alert';
import {Button} from '@shadcn/button/button';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {Select} from '@shadcn/forms/select/select';
import {useQuery} from '@tanstack/react-query';
import {MessageDescriptor} from '@ui/i18n/message-descriptor';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {CircleAlertIcon, ExternalLinkIcon} from 'lucide-react';
import {ComponentType, Fragment, ReactElement} from 'react';
import {useForm, useFormContext} from 'react-hook-form';

const queueConnectionOptions = [
  {value: 'sync', label: <Trans message="None (Default)" />},
  {value: 'beanstalkd', label: 'Beanstalkd'},
  {value: 'database', label: <Trans message="Database" />},
  {value: 'sqs', label: <Trans message="SQS (Amazon simple queue service)" />},
  {value: 'redis', label: 'Redis'},
] as const;

interface Props {
  tabs: ReactElement;
  title: ReactElement<MessageDescriptor>;
}
export function QueueSettings({tabs, title}: Props) {
  const {data} = useAdminSettings();
  const form = useForm<AdminSettings>({
    defaultValues: {
      server: {
        queue_connection: data.server.queue_connection ?? 'sync',
        aws_access_key_id: data.server.aws_access_key_id ?? '',
        aws_secret_access_key: data.server.aws_secret_access_key ?? '',
        sqs_prefix: data.server.sqs_prefix ?? '',
        sqs_queue: data.server.sqs_queue ?? '',
        aws_default_region: data.server.aws_default_region ?? '',
      },
    },
  });
  const selectedDriver = form.watch('server.queue_connection');

  return (
    <AdminSettingsLayout form={form} title={title} tabs={tabs}>
      <div className="flex flex-col gap-6">
        <QueueMethodPanel />
        {selectedDriver !== 'sync' && <QueueStatusPanel />}
      </div>
    </AdminSettingsLayout>
  );
}

export function QueueMethodPanel() {
  const {watch, clearErrors} = useFormContext<AdminSettings>();
  const queueDriver = watch('server.queue_connection');

  let CredentialSection: ComponentType<CredentialProps> | null = null;
  if (queueDriver === 'sqs') {
    CredentialSection = SqsCredentials;
  }
  return (
    <SettingsPanel
      title={<Trans message="Queue Method" />}
      description={
        <Trans message="Queues allow deferring time-consuming tasks, such as sending emails, until a later time." />
      }
      link={
        AdminDocsUrls.settings.queue ? (
          <DocsLink link={AdminDocsUrls.settings.queue} />
        ) : undefined
      }
    >
      <SettingsErrorGroup
        separatorTop={false}
        separatorBottom={false}
        name="queue_group"
      >
        {isInvalid => (
          <Field.Group>
            <HookForm.Field invalid={isInvalid} name="server.queue_connection">
              <Select.Root
                items={queueConnectionOptions}
                onValueChange={() => clearErrors()}
              >
                <Select.Trigger className="w-full">
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  {queueConnectionOptions.map(option => (
                    <Select.Item key={option.value} value={option.value}>
                      {option.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
              <Field.Error />
            </HookForm.Field>
            {CredentialSection && <CredentialSection isInvalid={isInvalid} />}
          </Field.Group>
        )}
      </SettingsErrorGroup>
    </SettingsPanel>
  );
}
function QueueStatusPanel() {
  const {base_url} = useSettings();
  const {data, status} = useQueueStats();

  const workerIsRunning = status !== 'pending' && data?.status === 'running';

  return (
    <SettingsPanel
      title={<Trans message="Queue Status" />}
      description={
        <Trans message="Monitor the current status of your queue and access the queue dashboard." />
      }
    >
      <div className="flex items-center gap-3.5">
        {workerIsRunning ? (
          <Fragment>
            <div className="flex w-max min-w-27 items-center gap-2 rounded-button bg-positive/10 px-2.5 py-1.5 text-sm capitalize">
              <div className="h-2.5 w-2.5 rounded-full bg-positive" />
              <Trans message="Worker is running" />
            </div>
            <Button
              variant="outline"
              size="sm"
              color="primary"
              nativeButton={false}
              render={
                <a
                  href={`${base_url}/horizon`}
                  target="_blank"
                  rel="noreferrer"
                />
              }
            >
              <Trans message="Monitor" />
              <ExternalLinkIcon />
            </Button>
          </Fragment>
        ) : (
          <WorkerInactiveWarning />
        )}
      </div>
    </SettingsPanel>
  );
}

function WorkerInactiveWarning() {
  return (
    <Alert.Root variant="destructive" fillStyle="subtleFill">
      <CircleAlertIcon />
      <Alert.Title>
        <Trans message="Queue worker is inactive" />
      </Alert.Title>
      <Alert.Description>
        <Trans message="The queue worker is not running. Please start the worker or set queue driver to 'none', otherwise some features will not work properly." />
      </Alert.Description>
    </Alert.Root>
  );
}

interface CredentialProps {
  isInvalid: boolean;
}
function SqsCredentials({isInvalid}: CredentialProps) {
  return (
    <>
      <HookForm.Field invalid={isInvalid} name="server.aws_access_key_id">
        <Field.Label>
          <Trans message="SQS queue key" />
        </Field.Label>
        <Input required />
        <Field.Error />
      </HookForm.Field>
      <HookForm.Field invalid={isInvalid} name="server.aws_secret_access_key">
        <Field.Label>
          <Trans message="SQS queue secret" />
        </Field.Label>
        <Input required />
        <Field.Error />
      </HookForm.Field>
      <HookForm.Field invalid={isInvalid} name="server.sqs_prefix">
        <Field.Label>
          <Trans message="SQS queue prefix" />
        </Field.Label>
        <Input required />
        <Field.Error />
      </HookForm.Field>
      <HookForm.Field invalid={isInvalid} name="server.sqs_queue">
        <Field.Label>
          <Trans message="SQS queue name" />
        </Field.Label>
        <Input required />
        <Field.Error />
      </HookForm.Field>
      <HookForm.Field invalid={isInvalid} name="server.aws_default_region">
        <Field.Label>
          <Trans message="SQS queue region" />
        </Field.Label>
        <Input required />
        <Field.Error />
      </HookForm.Field>
    </>
  );
}

interface QueueStatsResponse {
  failedJobs: number;
  jobsPerMinute: number;
  pausedMasters: number;
  periods: {
    failedJobs: number;
    recentJobs: number;
  };
  processes: number;
  queueWithMaxRuntime?: string;
  queueWithMaxThroughput?: string;
  recentJobs: number;
  status: 'running' | 'inactive' | 'paused';
}

function useQueueStats() {
  const {site} = useSettings();
  return useQuery({
    queryKey: ['queue-stats'],
    queryFn: () =>
      site.demo
        ? Promise.resolve({
            status: 'running',
          })
        : apiClient
            .get<QueueStatsResponse>('horizon/api/stats')
            .then(response => response.data),
    refetchInterval: 5000, // Poll every 5s
  });
}
