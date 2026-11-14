import {useHcManagerBasePath} from '@app/help-center/manager/hc-manager-paths';
import {Button} from '@ui/buttons/button';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {SettingsIcon} from 'lucide-react';
import {Link} from 'react-router';

/** Single action used by the Structure and All articles headers. */
export function HcAdminSettingsButton() {
  const root = useHcManagerBasePath();
  const {trans} = useTrans();

  if (root !== '/admin/help') return null;

  return (
    <Button
      variant="outline"
      size="xs"
      elementType={Link}
      to="/admin/settings/hc"
      aria-label={trans({message: 'Help center settings'})}
      className="min-w-8 gap-1 px-2 sm:px-3"
    >
      <SettingsIcon className="size-4" aria-hidden="true" />
      <span className="hidden sm:inline">
        <Trans message="Settings" />
      </span>
    </Button>
  );
}
