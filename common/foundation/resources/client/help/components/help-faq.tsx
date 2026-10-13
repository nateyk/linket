import {Accordion} from '@shadcn/accordion/accordion';
import {Trans} from '@ui/i18n/trans';
import {Link} from 'react-router';
import {ArrowRightIcon} from 'lucide-react';
import {
  HelpArticleListItem,
  HelpCategory,
} from '@common/help/help-queries';

interface Props {
  categories: HelpCategory[];
  /** How many of the most-viewed articles to surface. */
  limit?: number;
}

/**
 * Flattens every category's articles, drops duplicates and ones without a
 * usable answer, then returns the most-viewed first. Pure so it can be unit
 * tested without a DOM.
 */
export function selectTopArticles(
  categories: HelpCategory[],
  limit: number,
): HelpArticleListItem[] {
  const seen = new Set<number>();
  const flat: HelpArticleListItem[] = [];

  for (const category of categories) {
    for (const article of category.articles ?? []) {
      if (seen.has(article.id)) continue;
      seen.add(article.id);
      flat.push(article);
    }
  }

  return flat
    .filter(article => article.short_description?.trim())
    .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
    .slice(0, limit);
}

/**
 * "Most frequently asked questions" — surfaces the most-viewed help articles
 * as an accordion. Each question is the article title; the answer is its short
 * description with a link through to the full article.
 */
export function HelpFaq({categories, limit = 6}: Props) {
  const articles = selectTopArticles(categories, limit);

  if (!articles.length) {
    return null;
  }

  return (
    <section className="mx-auto w-full max-w-4xl px-6 pt-14">
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          <Trans message="Most frequently asked questions" />
        </h2>
        <p className="mt-3 text-muted-foreground">
          <Trans message="Here are the questions our users check most often" />
        </p>
      </div>
      <Accordion variant="separated">
        {articles.map(article => (
          <Accordion.Item key={article.id} value={`${article.id}`}>
            <Accordion.Trigger className="p-4 text-base" headingRender={<h3 />}>
              {article.title}
            </Accordion.Trigger>
            <Accordion.Content className="p-4 text-base text-muted-foreground">
              <p>{article.short_description}</p>
              <Link
                to={`/help/articles/${article.slug}`}
                className="mt-3 inline-flex items-center gap-1 font-medium text-primary hover:underline"
              >
                <Trans message="Read full article" />
                <ArrowRightIcon className="size-4" />
              </Link>
            </Accordion.Content>
          </Accordion.Item>
        ))}
      </Accordion>
    </section>
  );
}
