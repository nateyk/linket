import {loadMenuEditorConfigOptions} from '@common/admin/settings/settings-queries';
import {MenuItemConfig} from '@common/menus/menu-config';
import {useQuery} from '@tanstack/react-query';

export function useAvailableRoutes(): Partial<MenuItemConfig>[] {
  const {data} = useQuery(loadMenuEditorConfigOptions());

  if (!data?.config) return [];

  return data.config.available_routes.map(route => {
    return {
      id: route,
      label: route,
      action: route,
      type: 'route',
      target: '_self',
    };
  });
}
