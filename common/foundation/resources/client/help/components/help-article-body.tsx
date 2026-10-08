import {useMemo} from 'react';
import {sanitizeHelpHtml} from './sanitize-help-html';

interface Props {
  html: string;
}

export function HelpArticleBody({html}: Props) {
  const sanitized = useMemo(() => sanitizeHelpHtml(html), [html]);
  return (
    <div
      className="prose max-w-none dark:prose-invert wrap-break-word"
      dangerouslySetInnerHTML={{__html: sanitized}}
    />
  );
}
