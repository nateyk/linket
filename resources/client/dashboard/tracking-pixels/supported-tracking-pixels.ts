export interface SupportedTrackingPixel {
  name: string;
  type: 'number' | 'text';
  pattern?: string;
  docsUrl?: string;
}

export const SupportedTrackingPixels: SupportedTrackingPixel[] = [
  {
    name: 'facebook',
    type: 'number',
    docsUrl:
      'https://www.facebook.com/business/help/952192354843755?id=1205376682832142',
  },
  {
    name: 'twitter',
    type: 'number',
    docsUrl:
      'https://business.twitter.com/en/help/campaign-measurement-and-analytics/conversion-tracking-for-websites.html',
  },
  {
    name: 'google-tag-manager',
    type: 'text',
    pattern: 'GTM-[a-zA-Z0-9]+',
    docsUrl: 'https://tagmanager.google.com',
  },
  {
    name: 'google-analytics',
    type: 'text',
    docsUrl: 'https://analytics.google.com',
  },
  {
    name: 'adwords',
    type: 'number',
    docsUrl: 'https://ads.google.com',
  },
  {
    name: 'bing',
    type: 'number',
    docsUrl:
      'https://about.ads.microsoft.com/en-us/solutions/tools/universal-event-tracking',
  },
  {
    name: 'pinterest',
    type: 'number',
    docsUrl:
      'https://help.pinterest.com/en/business/article/track-conversions-with-pinterest-tag',
  },
  {
    name: 'linkedin',
    type: 'text',
    docsUrl:
      'https://www.linkedin.com/help/lms/answer/a418880/add-the-linkedin-insight-tag-to-your-website',
  },
  {
    name: 'quora',
    type: 'text',
    pattern: '[a-z0-9]+',
    docsUrl:
      'https://quoraadsupport.zendesk.com/hc/en-us/articles/115010303387-About-the-Quora-Pixel',
  },
  {
    name: 'adroll',
    type: 'text',
    docsUrl:
      'https://help.adroll.com/hc/en-us/articles/211846018-What-is-the-AdRoll-Pixel',
  },
  {
    name: 'nexus-segment',
    type: 'text',
    docsUrl: 'https://segment.com/catalog/integrations/appnexus',
  },
  {
    name: 'custom',
    type: 'text',
  },
];
