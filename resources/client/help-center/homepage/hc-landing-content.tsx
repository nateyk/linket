import {ArticleGrid} from '@app/help-center/homepage/article-grid';
import {CategoryGrid} from '@app/help-center/homepage/category-grid';
import {MultiProductArticleGrid} from '@app/help-center/homepage/multi-product-article-grid';
import {useSettings} from '@ui/settings/use-settings';

export function HcLandingContent() {
  const {hcLanding} = useSettings();
  const variant = hcLanding?.content?.variant ?? 'articleGrid';

  if (variant === 'categoryGrid') {
    return <CategoryGrid />;
  }

  if (variant === 'multiProduct') {
    return <MultiProductArticleGrid />;
  }

  return <ArticleGrid />;
}
