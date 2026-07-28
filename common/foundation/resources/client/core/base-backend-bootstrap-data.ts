import {Role} from '@app/gen/schemas/role';
import {Workspace} from '@app/gen/schemas/workspace';
import {UploadType} from '@app/site-config';

export type PartialUploadType = {
  visibility: string;
  max_file_size?: number | string;
  accept?: string[];
  backends: {id: string; driver: string; direct_upload?: boolean}[];
};

export interface BaseBackendBootstrapData {
  csrf_token: string;
  auth_redirect_uri: string;
  guest_role: Role | null;
  default_meta_tags?: string;
  show_cookie_notice?: boolean;
  uploading_types: Record<keyof typeof UploadType, PartialUploadType>;
  workspaces?: Workspace[];
}
