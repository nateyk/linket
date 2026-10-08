interface Props {
  html: string;
}

export function HelpArticleBody({html}: Props) {
  return (
    <div
      className="prose max-w-none dark:prose-invert wrap-break-word"
      dangerouslySetInnerHTML={{__html: html}}
    />
  );
}
