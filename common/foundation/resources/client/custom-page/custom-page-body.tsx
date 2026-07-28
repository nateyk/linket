import {highlightAllCode} from '@common/text-editor/highlight/highlight-code';
import {useEffect, useRef} from 'react';

interface CustomPageBodyProps {
  page: {
    title?: string | null;
    body?: string | null;
  };
}
export function CustomPageBody({page}: CustomPageBodyProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (bodyRef.current) {
      highlightAllCode(bodyRef.current);
    }
  }, []);

  return (
    <div className="px-4 md:px-6">
      <div className="custom-page-body mx-auto my-12.5 prose dark:prose-invert">
        <h1>{page.title}</h1>
        {page.body && (
          <div
            ref={bodyRef}
            className="wrap-break-word whitespace-pre-wrap"
            dangerouslySetInnerHTML={{__html: page.body}}
          />
        )}
      </div>
    </div>
  );
}
