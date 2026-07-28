import {UnstyledCustomMenuItem} from '@common/menus/custom-menu';
import {useCustomMenu} from '@common/menus/use-custom-menu';
import {useSettings} from '@ui/settings/use-settings';
import {Link} from 'react-router';

export function AuthLayoutFooter() {
  const {branding} = useSettings();
  const menu = useCustomMenu('auth-page-footer');

  return (
    <div className="mt-auto flex items-center gap-7.5 pt-10.5 pb-8 text-sm text-muted-foreground">
      <Link className="hover:underline" to="/">
        © {branding.site_name}
      </Link>
      {menu?.items.map(item => (
        <UnstyledCustomMenuItem
          key={item.id}
          item={item}
          className="transition-colors hover:underline"
        />
      ))}
    </div>
  );
}
