import {useHcManagerBasePath} from '@app/help-center/manager/hc-manager-paths';
import {Breadcrumb} from '@ui/breadcrumbs/breadcrumb';
import {BreadcrumbItem} from '@ui/breadcrumbs/breadcrumb-item';
import {Trans} from '@ui/i18n/trans';

interface Props {
  category?: {id: number; name: string};
  section?: {id: number; name: string};
}
export function HcManagerBreadcrumb({category, section}: Props) {
  const root = useHcManagerBasePath();
  return (
    <Breadcrumb size="xl">
      <BreadcrumbItem to={`${root}/arrange`}>
        <Trans message="Help center" />
      </BreadcrumbItem>
      {category && (
        <BreadcrumbItem to={`${root}/arrange/categories/${category.id}`}>
          <span className="block max-w-24 truncate sm:max-w-64 md:max-w-xs" title={category.name}>
            {category.name}
          </span>
        </BreadcrumbItem>
      )}
      {section && (
        <BreadcrumbItem>
          <span className="block max-w-24 truncate sm:max-w-64 md:max-w-xs" title={section.name}>
            {section.name}
          </span>
        </BreadcrumbItem>
      )}
    </Breadcrumb>
  );
}
