import {Breadcrumb} from '@ui/breadcrumbs/breadcrumb';
import {BreadcrumbItem} from '@ui/breadcrumbs/breadcrumb-item';
import {Trans} from '@ui/i18n/trans';

interface Props {
  category?: {id: number; name: string};
  section?: {id: number; name: string};
}
export function HcManagerBreadcrumb({category, section}: Props) {
  return (
    <Breadcrumb size="xl">
      <BreadcrumbItem to="/agent/hc/arrange">
        <Trans message="Help center" />
      </BreadcrumbItem>
      {category && (
        <BreadcrumbItem to={`/agent/hc/arrange/categories/${category.id}`}>
          {category.name}
        </BreadcrumbItem>
      )}
      {section && <BreadcrumbItem>{section.name}</BreadcrumbItem>}
    </Breadcrumb>
  );
}
