import {MenuConfig, MenuItemConfig} from '@common/menus/menu-config';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Trans} from '@ui/i18n/trans';
import {isAbsoluteUrl} from '@ui/utils/urls/is-absolute-url';
import {ComponentProps, ReactElement} from 'react';
import {useNavigate} from 'react-router';

type Props = {
  menu: MenuConfig;
  trigger?: ReactElement<ComponentProps<'button'>>;
};
export function CustomMenuDropdown({menu, trigger}: Props) {
  const navigate = useNavigate();

  const handleItemClick = (item: MenuItemConfig) => {
    if (isAbsoluteUrl(item.action)) {
      window.open(item.action, item.target)?.focus();
    } else {
      navigate(item.action);
    }
  };

  return (
    <Dropdown.Root>
      <Dropdown.Trigger render={trigger} />
      <Dropdown.Content>
        {menu.items.map(item => (
          <Dropdown.Item key={item.id} onClick={() => handleItemClick(item)}>
            <Trans message={item.label} />
          </Dropdown.Item>
        ))}
      </Dropdown.Content>
    </Dropdown.Root>
  );
}
