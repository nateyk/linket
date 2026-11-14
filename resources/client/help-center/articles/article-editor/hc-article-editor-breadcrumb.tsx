import {helpCenterQueries} from '@app/help-center/help-center-queries';
import {useHcManagerBasePath} from '@app/help-center/manager/hc-manager-paths';
import {useQuery} from '@tanstack/react-query';
import {Breadcrumb} from '@ui/breadcrumbs/breadcrumb';
import {
  BreadcrumbItem,
  BreadcrumbItemProps,
} from '@ui/breadcrumbs/breadcrumb-item';
import {MessageDescriptor} from '@ui/i18n/message-descriptor';
import {Trans} from '@ui/i18n/trans';
import {ReactElement} from 'react';
import {UIMatch, useMatches, useParams} from 'react-router';

interface Props {
  children?: ReactElement<BreadcrumbItemProps>;
}
export function HcArticleEditorBreadcrumb({children}: Props) {
  const breadcrumbRoot = useHcArticleBreadcrumbRoot();
  const root = useHcManagerBasePath();
  const {sectionId, categoryId} = useParams();
  const {data} = useQuery({
    ...helpCenterQueries.categories.normalizedList(),
    enabled: !!(sectionId || categoryId),
  });

  if (sectionId && data?.categories) {
    const category = data.categories.find(c =>
      c.sections.some(s => `${s.id}` === sectionId),
    );
    const section = category?.sections.find(s => `${s.id}` === sectionId);
    if (category && section) {
      return (
        <Breadcrumb size="xl">
          <BreadcrumbItem to={`${root}/arrange`}>
            <Trans message="Help center" />
          </BreadcrumbItem>
          <BreadcrumbItem
            to={`${root}/arrange/categories/${category.id}`}
          >
            {category.name}
          </BreadcrumbItem>
          <BreadcrumbItem
            to={`${root}/arrange/sections/${section.id}`}
          >
            {section.name}
          </BreadcrumbItem>
          {children}
        </Breadcrumb>
      );
    }
  }

  return (
    <Breadcrumb size="xl">
      {breadcrumbRoot && (
        <BreadcrumbItem to={`${root}/arrange`}>
          <Trans {...breadcrumbRoot} />
        </BreadcrumbItem>
      )}
      <BreadcrumbItem to={`${root}/articles`}>
        <Trans message="Articles" />
      </BreadcrumbItem>
      {children}
    </Breadcrumb>
  );
}

type Match = UIMatch<
  undefined,
  {breadcrumbRoot: MessageDescriptor} | undefined
>;
function useHcArticleBreadcrumbRoot(): MessageDescriptor | undefined {
  const matches = useMatches();
  const match = (matches as Match[]).find(m => m.handle?.breadcrumbRoot);
  return match?.handle?.breadcrumbRoot;
}
