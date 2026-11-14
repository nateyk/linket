import {useHcManagerBasePath} from '@app/help-center/manager/hc-manager-paths';
import {Breadcrumb} from '@ui/breadcrumbs/breadcrumb';
import {BreadcrumbItem} from '@ui/breadcrumbs/breadcrumb-item';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {ChevronLeftIcon} from 'lucide-react';
import {Link} from 'react-router';

interface Props {
  category?: {id: number; name: string};
  section?: {id: number; name: string};
}

export function HcManagerBreadcrumb({category, section}: Props) {
  const root = useHcManagerBasePath();
  const {trans} = useTrans();
  const backTo = section && category
    ? `${root}/arrange/categories/${category.id}`
    : `${root}/arrange`;
  const title = section?.name ?? category?.name;

  return (
    <div className="min-w-0 w-full overflow-hidden">
      <div className="flex min-w-0 items-center gap-1 sm:hidden">
        <Link
          to={backTo}
          aria-label={trans({message: 'Back'})}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-input hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <ChevronLeftIcon className="size-4" aria-hidden="true" />
        </Link>
        <span className="block min-w-0 flex-1 truncate text-base font-semibold" title={title}>
          {title}
        </span>
      </div>

      <div className="hidden min-w-0 overflow-hidden sm:block">
        <Breadcrumb size="xl" className="max-w-full overflow-hidden">
          <BreadcrumbItem to={`${root}/arrange`}>
            <Trans message="Help center" />
          </BreadcrumbItem>
          {category && (
            <BreadcrumbItem to={`${root}/arrange/categories/${category.id}`}>
              <span className="block max-w-64 truncate md:max-w-xs" title={category.name}>
                {category.name}
              </span>
            </BreadcrumbItem>
          )}
          {section && (
            <BreadcrumbItem>
              <span className="block max-w-64 truncate md:max-w-xs" title={section.name}>
                {section.name}
              </span>
            </BreadcrumbItem>
          )}
        </Breadcrumb>
      </div>
    </div>
  );
}
