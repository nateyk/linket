import {useEffect} from 'react';

interface Props {
  data: Record<string, unknown>;
}

export function HelpArticleJsonLd({data}: Props) {
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, [data]);

  return null;
}
