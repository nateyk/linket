import {useEffect} from 'react';

interface Props {
  data: Record<string, unknown>;
}

export function HelpArticleJsonLd({data}: Props) {
  const json = JSON.stringify(data);
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = json;
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, [json]);

  return null;
}
