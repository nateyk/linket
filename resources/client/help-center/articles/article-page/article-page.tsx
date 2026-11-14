import {ArticleAttachments} from '@app/help-center/articles/article-attachments';
import {getEditArticleLink} from '@app/help-center/articles/article-link';
import {ArticlePageBreadcrumb} from '@app/help-center/articles/article-page/article-page-breadcrumb';
import {ArticlePageNavItem} from '@app/help-center/articles/article-page/article-page-data';
import {ArticlePageFeedback} from '@app/help-center/articles/article-page/article-page-feedback';
import {ArticlePageLayout} from '@app/help-center/articles/article-page/article-page-layout';
import {HcSidenav} from '@app/help-center/articles/hc-sidenav';
import {helpCenterQueries} from '@app/help-center/help-center-queries';
import {useAuth} from '@common/auth/use-auth';
import {PageMetaTags} from '@common/http/page-meta-tags';
import {highlightAllCode} from '@common/text-editor/highlight/highlight-code';
import {useSuspenseQuery} from '@tanstack/react-query';
import {LinkStyle} from '@ui/buttons/external-link';
import {IconButton} from '@ui/buttons/icon-button';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {AlignLeftIcon} from '@ui/icons/lucide/align-left';
import {EditIcon} from '@ui/icons/material/Edit';
import {useSettings} from '@ui/settings/use-settings';
import clsx from 'clsx';
import {ChevronDownIcon} from 'lucide-react';
import {useEffect, useId, useRef, useState} from 'react';
import {Link, useLocation, useParams} from 'react-router';

export function Component() {
  const {hash} = useLocation();
  const settings = useSettings();
  const {hasPermission, hasRole} = useAuth();
  const {trans} = useTrans();
  const {categoryId, sectionId, articleId} = useParams();
  const query = useSuspenseQuery(
    helpCenterQueries.articles.getForArticlePage({
      articleId: articleId!,
      categoryId,
      sectionId,
    }),
  );

  const canEdit =
    hasPermission('articles.update') ||
    (query.data.article.managed_by_role &&
      hasRole(query.data.article.managed_by_role));

  // Keep headings clear of the sticky navigation when following anchors.
  useEffect(() => {
    document.documentElement.style.setProperty('--html-spt', '84px');
    return () => {
      document.documentElement.style.removeProperty('--html-spt');
    };
  }, [query.data, hash]);

  return (
    <ArticlePageLayout
      leftSidenav={<HcSidenav categoryNav={query.data.categoryNav} />}
      rightSidenav={<RightSidenav nav={query.data.pageNav} />}
      categoryId={query.data.article.path?.[0]?.id}
    >
      <PageMetaTags query={query} />
      <article className="min-w-0">
        <header className="mb-28 sm:mb-36">
          {!!query.data.article.path?.length && (
            <ArticlePageBreadcrumb path={query.data.article.path} />
          )}
          <div className="mt-12 flex min-w-0 items-start gap-8">
            <h1 className="min-w-0 flex-1 break-words text-3xl font-bold leading-tight sm:text-4xl">
              {query.data.article.title}
            </h1>
            {canEdit && (
              <IconButton
                aria-label={trans(message('Edit article'))}
                className="shrink-0 text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                elementType={Link}
                to={getEditArticleLink(query.data.article, {isAdmin: hasPermission('admin.access')})}
              >
                <EditIcon />
              </IconButton>
            )}
          </div>
        </header>

        <MobileTableOfContents nav={query.data.pageNav} />
        <ArticleBody body={query.data.article.body} />
        <ArticleAttachments
          articleId={query.data.article.id}
          attachments={query.data.article.attachments}
        />
      </article>
      {!settings.article?.hide_new_ticket_link && (
        <div className="my-48 border-y py-32 sm:py-48">
          <Trans
            message="Have more questions? <a>Submit a request</a>"
            values={{
              a: label => (
                <Link className={LinkStyle} to="/hc/tickets/new">
                  {label}
                </Link>
              ),
            }}
          />
        </div>
      )}
      <ArticlePageFeedback articleId={query.data.article.id} />
    </ArticlePageLayout>
  );
}

interface RightSidenavProps {
  nav?: ArticlePageNavItem[];
}

function MobileTableOfContents({nav}: RightSidenavProps) {
  const titleId = useId();

  if (!nav?.length) {
    return null;
  }

  return (
    <details className="group mb-28 rounded-panel border border-divider-lighter bg-alt/30 px-16 py-12 xl:hidden">
      <summary
        id={titleId}
        className="flex min-h-44 cursor-pointer items-center gap-8 rounded-panel text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <AlignLeftIcon size="xs" aria-hidden="true" />
        <Trans message="On this page" />
        <ChevronDownIcon aria-hidden="true" className="ml-auto size-4 transition-transform group-open:rotate-180" />
      </summary>
      <nav aria-labelledby={titleId} className="mt-12 border-t pt-12">
        <ol role="list" className="space-y-4">
          {nav.map(item => (
            <li key={item.slug} className={item.indent ? 'pl-16' : undefined}>
              <Link
                to={`#${item.slug}`}
                className="block min-h-40 break-words rounded-panel px-8 py-8 text-sm text-muted-foreground hover:bg-hover hover:text-main focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {item.display_name}
              </Link>
            </li>
          ))}
        </ol>
      </nav>
    </details>
  );
}

function RightSidenav({nav}: RightSidenavProps) {
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!nav?.length || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          const el = document.getElementById(`to-${entry.target.id}`);
          if (el && entry.isIntersecting) {
            setActiveItem(el.id.replace(/^to-/, ''));
          }
        }
      },
      {rootMargin: '0px 0px -50% 0px'},
    );

    const headings = nav
      .map(item => document.getElementById(item.slug))
      .filter(Boolean) as HTMLElement[];

    headings.forEach(heading => observer.observe(heading));
    return () => observer.disconnect();
  }, [nav]);

  if (!nav?.length) {
    return null;
  }

  return (
    <div className="dashboard-grid-sidenav-right compact-scrollbar hidden w-56 xl:flex xl:w-72">
      <nav
        aria-labelledby={titleId}
        className="sticky top-64 h-[calc(100dvh-64px)] w-full overflow-y-auto py-64 pr-32 xl:pr-64"
      >
        <div className="flex items-center gap-8">
          <AlignLeftIcon size="xs" aria-hidden="true" />
          <h2 id={titleId} className="font-display text-sm font-medium">
            <Trans message="On this page" />
          </h2>
        </div>
        <ol role="list" className="mt-16 space-y-4 text-sm">
          {nav.map(item => {
            const isActive = item.slug === activeItem;
            return (
              <li key={item.slug} className={item.indent ? 'pl-20' : undefined}>
                <Link
                  className={clsx(
                    'block break-words rounded-panel px-8 py-8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                    isActive
                      ? 'bg-selected font-medium text-main'
                      : 'text-muted-foreground hover:bg-hover hover:text-main',
                  )}
                  to={`#${item.slug}`}
                  id={`to-${item.slug}`}
                  aria-current={isActive ? 'location' : undefined}
                >
                  {item.display_name}
                </Link>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}

interface ArticleBodyProps {
  body: string;
}

function ArticleBody({body}: ArticleBodyProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const {trans} = useTrans();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (bodyRef.current) {
        highlightAllCode(bodyRef.current);
      }
    }, 30);
    return () => window.clearTimeout(timeout);
  }, [body]);

  // Give unlinked article images a native, keyboard-accessible preview link.
  // Images that already belong to a link/button keep their original behavior.
  useEffect(() => {
    const root = bodyRef.current;
    if (!root) return;

    const previews: {link: HTMLAnchorElement; image: HTMLImageElement}[] = [];
    root.querySelectorAll('img').forEach(image => {
      if (image.closest('a, button') || !image.getAttribute('src')) return;

      const link = document.createElement('a');
      link.href = image.currentSrc || image.src;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.className =
        'inline-block max-w-full rounded-panel focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';
      link.setAttribute(
        'aria-label',
        image.alt.trim()
          ? `${image.alt.trim()} — ${trans(message('Open image in new tab'))}`
          : trans(message('Open image in new tab')),
      );
      image.replaceWith(link);
      link.appendChild(image);
      previews.push({link, image});
    });

    return () => {
      previews.forEach(({link, image}) => {
        if (link.isConnected) link.replaceWith(image);
      });
    };
  }, [body, trans]);

  return (
    <div className="prose-pre:bg-slate-900 prose max-w-none dark:prose-invert prose-pre:rounded-panel prose-pre:shadow-lg prose-img:rounded-panel prose-img:border prose-img:border-lighter prose-img:bg-alt/80 prose-img:p-8 dark:prose-pre:shadow-none dark:prose-pre:ring-1 dark:prose-pre:ring-divider">
      <div
        ref={bodyRef}
        className="article-body min-w-0 max-w-full break-words [overflow-wrap:anywhere] [&_img]:h-auto [&_img]:max-w-full [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto"
        dangerouslySetInnerHTML={{__html: body}}
      />
    </div>
  );
}
