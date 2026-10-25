import {User} from '@app/gen/schemas/user';
import {Settings} from '@ui/settings/settings';
import {CssTheme} from '@ui/themes/css-theme';

export interface BootstrapData {
  sentry_release?: string;
  is_mobile_device?: boolean;
  settings: Settings;
  user: User | null;
  themes: CssTheme[];
  livechatWidgetUser?: {
    name: string;
    email: string;
    email_hash: string;
  };
  i18n: {
    locales: {
      name: string;
      language: string;
      lines: Record<string, string>;
    }[];
    active: string;
    direction: 'ltr' | 'rtl';
  };
}
