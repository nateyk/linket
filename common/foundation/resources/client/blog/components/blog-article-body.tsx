import {useMemo} from 'react';
import {sanitizeBlogHtml} from './sanitize-blog-html';

interface Props {
  html: string;
}

export function BlogArticleBody({html}: Props) {
  const sanitized = useMemo(() => sanitizeBlogHtml(html), [html]);
  return (
    <div
      className="prose max-w-none dark:prose-invert wrap-break-word"
      dangerouslySetInnerHTML={{__html: sanitized}}
    />
  );
}
