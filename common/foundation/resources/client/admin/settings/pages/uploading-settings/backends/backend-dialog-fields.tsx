import {AdminDocsUrls} from '@app/admin/admin-config';
import {DocsLink} from '@common/admin/settings/layout/settings-links';
import {
  BackendFormValue,
  supportedBackends,
} from '@common/admin/settings/pages/uploading-settings/backends/backends';
import {FtpForm} from '@common/admin/settings/pages/uploading-settings/credential-forms/ftp-form';
import {S3Form} from '@common/admin/settings/pages/uploading-settings/credential-forms/s3-form';
import {SftpForm} from '@common/admin/settings/pages/uploading-settings/credential-forms/sftp-form';
import {WebdavForm} from '@common/admin/settings/pages/uploading-settings/credential-forms/webdav-form';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {Select} from '@shadcn/forms/select/select';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {useFormContext, useWatch} from 'react-hook-form';

export function BackendDialogFields() {
  const {trans} = useTrans();
  return (
    <Field.Group>
      <HookForm.Field name="name">
        <Field.Label>
          <Trans message="Name" />
        </Field.Label>
        <Input required />
        <Field.Error />
      </HookForm.Field>
      <HookForm.Field name="root">
        <Field.Label>
          <Trans message="Storage path" />
        </Field.Label>
        <Input required />
        <Field.Description>
          <Trans message="Relative or absolute path where uploads should be stored. Leave empty to use default location." />
        </Field.Description>
        <Field.Error />
      </HookForm.Field>
      <HookForm.Field name="domain">
        <Field.Label>
          <Trans message="Custom domain" />
        </Field.Label>
        <Input type="url" placeholder={trans(message('Optional'))} />
        <Field.Description>
          <Trans message="Custom domain or CDN url from which to serve files uploaded to this backend." />
        </Field.Description>
        <Field.Error />
      </HookForm.Field>
      <TypeSelect />
      <Credentials />
    </Field.Group>
  );
}

function TypeSelect() {
  const {clearErrors} = useFormContext<BackendFormValue>();
  return (
    <HookForm.Field name="type">
      <Field.Label>
        <Trans message="Type" />
      </Field.Label>
      <Select.Root
        items={supportedBackends}
        onValueChange={() => clearErrors()}
      >
        <Select.Trigger className="w-full">
          <Select.Value />
        </Select.Trigger>
        <Select.Content>
          {supportedBackends.map(option => (
            <Select.Item key={option.value} value={option.value}>
              {option.label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
      <Field.Description>
        <TypeDocsUrl />
      </Field.Description>
      <Field.Error />
    </HookForm.Field>
  );
}

function TypeDocsUrl() {
  const type = useWatch<BackendFormValue, 'type'>({
    name: 'type',
  });
  let url = null;

  if (type === 's3') {
    url = AdminDocsUrls.settings.s3;
  } else if (type === 'backblaze') {
    url = AdminDocsUrls.settings.backblaze;
  }

  if (!url) return null;

  return <DocsLink link={url} />;
}

export function Credentials() {
  const selectedType = useWatch<BackendFormValue, 'type'>({
    name: 'type',
  });

  switch (selectedType) {
    case 's3':
    case 'digitalocean':
    case 'backblaze':
      return <S3Form formPrefix={selectedType} />;
    case 's3_compatible':
      return <S3Form formPrefix={selectedType} showEndpointField />;
    case 'ftp':
      return <FtpForm formPrefix={selectedType} />;
    case 'sftp':
      return <SftpForm formPrefix={selectedType} />;
    case 'webdav':
      return <WebdavForm formPrefix={selectedType} />;
    default:
      return null;
  }
}
