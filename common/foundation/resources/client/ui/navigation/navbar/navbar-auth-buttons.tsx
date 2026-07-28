import {useNavigate} from '@common/ui/navigation/use-navigate';
import {ButtonColor, LinkButton} from '@shadcn/button/button';
import {IconButton} from '@ui/buttons/icon-button';
import {Item} from '@ui/forms/listbox/item';
import {Trans} from '@ui/i18n/trans';
import {PersonIcon} from '@ui/icons/material/Person';
import {Menu, MenuTrigger} from '@ui/menu/menu-trigger';
import {useSettings} from '@ui/settings/use-settings';
import {Fragment} from 'react';

interface NavbarAuthButtonsProps {
  primaryButtonColor?: ButtonColor;
}
export function NavbarAuthButtons({
  primaryButtonColor,
}: NavbarAuthButtonsProps) {
  return (
    <Fragment>
      <MobileButtons />
      <DesktopButtons primaryButtonColor={primaryButtonColor} />
    </Fragment>
  );
}

interface DesktopButtonsProps {
  primaryButtonColor: ButtonColor;
}
function DesktopButtons({primaryButtonColor}: DesktopButtonsProps) {
  const {registration} = useSettings();
  return (
    <div className="text-sm max-md:hidden">
      {!registration?.disable && (
        <LinkButton to="/register" variant="ghost" className="mr-2.5">
          <Trans message="Register" />
        </LinkButton>
      )}
      <LinkButton
        to="/login"
        variant="default"
        color={primaryButtonColor ?? 'primary'}
      >
        <Trans message="Login" />
      </LinkButton>
    </div>
  );
}

function MobileButtons() {
  const {registration} = useSettings();
  const navigate = useNavigate();
  return (
    <MenuTrigger>
      <IconButton size="md" className="md:hidden">
        <PersonIcon />
      </IconButton>
      <Menu>
        <Item value="login" onSelected={() => navigate('/login')}>
          <Trans message="Login" />
        </Item>
        {!registration?.disable && (
          <Item value="register" onSelected={() => navigate('/register')}>
            <Trans message="Register" />
          </Item>
        )}
      </Menu>
    </MenuTrigger>
  );
}
