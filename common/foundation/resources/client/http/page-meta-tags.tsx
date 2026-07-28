import {DefaultMetaTags} from '@common/seo/default-meta-tags';
import {Helmet} from '@common/seo/helmet';
import {UseQueryResult, UseSuspenseQueryResult} from '@tanstack/react-query';

interface Props {
  query?: UseQueryResult<any> | UseSuspenseQueryResult<any>;
  data?: any;
}
export function PageMetaTags({query, data}: Props) {
  if (!data) {
    data = query?.data;
  }
  return data?.seoTags ? <Helmet tags={data.seoTags} /> : <DefaultMetaTags />;
}
