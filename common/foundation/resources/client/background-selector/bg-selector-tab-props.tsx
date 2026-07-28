import {UploadType} from '@app/site-config';
import {BackgroundSelectorConfig} from '@common/background-selector/background-selector-config';

export interface BgSelectorTabProps<T extends BackgroundSelectorConfig> {
  value?: T;
  onChange: (value: T | null) => void;
  className?: string;
  uploadType?: keyof typeof UploadType;
}
