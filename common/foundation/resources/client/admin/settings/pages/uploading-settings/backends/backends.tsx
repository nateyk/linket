import {Trans} from '@ui/i18n/trans';

export const supportedBackends = [
  {
    value: 'local',
    label: <Trans message="Local disk" />,
  },
  {
    value: 's3',
    label: <Trans message="Amazon S3" />,
  },
  {
    value: 's3_compatible',
    label: <Trans message="S3 API compatible provider" />,
  },
  {
    value: 'backblaze',
    label: <Trans message="Backblaze" />,
  },
  {
    value: 'webdav',
    label: <Trans message="WebDAV" />,
  },
  {
    value: 'ftp',
    label: <Trans message="FTP" />,
  },
  {
    value: 'sftp',
    label: <Trans message="SFTP" />,
  },
  {
    value: 'digitalocean',
    label: <Trans message="DigitalOcean spaces" />,
  },
];

type BackendType = (typeof supportedBackends)[number]['value'];

export type BackendFormValue = {
  name: string;
  type: BackendType;
  root?: string;
  domain?: string;
  config: Record<BackendType, Record<string, string | number>>;
};
