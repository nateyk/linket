/** @vitest-environment jsdom */
import {render, screen} from '@testing-library/react';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {useBootstrapDataStore} from '@ui/bootstrap-data/bootstrap-data-store';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {beforeEach, describe, expect, it} from 'vitest';

const lines = JSON.parse(
  readFileSync(resolve('resources/amharic-translations.json'), 'utf8'),
) as Record<string, string>;

function InlineTranslation() {
  const {trans} = useTrans();
  return <span>{trans({message: 'From :price', values: {price: '100 ETB'}})}</span>;
}

describe('SF-12 Amharic locale uses the actual React translation path', () => {
  beforeEach(() => {
    useBootstrapDataStore.setState({data: null} as never);
    useBootstrapDataStore.getState().mergeData({
      i18n: {
        active: 'am',
        direction: 'ltr',
        locales: [
          {name: 'አማርኛ', language: 'am', direction: 'ltr', lines},
        ],
      },
    } as never);
  });

  it('renders translated public, checkout, service and builder controls', () => {
    render(
      <>
        <span><Trans message="Products" /></span>
        <span><Trans message="Get for free" /></span>
        <span><Trans message="Request a quote" /></span>
        <span><Trans message="Appearance" /></span>
        <span><Trans message="Save changes" /></span>
        <span><Trans message="Create a service" /></span>
        <span><Trans message="Step :current of :total" values={{current: 2, total: 4}} /></span>
        <InlineTranslation />
      </>,
    );

    for (const translation of [
      'ምርቶች',
      'በነፃ ያግኙ',
      'የዋጋ ጥያቄ ያቅርቡ',
      'ገጽታ',
      'ለውጦችን አስቀምጥ',
      'አገልግሎት ፍጠር',
      'ደረጃ 2 ከ 4',
      'ከ 100 ETB ጀምሮ',
    ]) {
      expect(screen.getByText(translation)).toBeTruthy();
    }
  });

  it('covers messages used by the actual storefront, product, service and builder components', () => {
    const cases: Record<string, string[]> = {
      'resources/client/short-links/renderers/biolink-renderer/creator-profile-layout.tsx': ['Products', 'Services'],
      'resources/client/digital-products/public/digital-product-public-pages.tsx': ['Overview', 'Get for free'],
      'resources/client/services/public/public-service-page.tsx': ['Back to services', 'Request a quote'],
      'resources/client/dashboard/stores/store-editor/store-editor-page.tsx': ['Appearance', 'Save changes'],
      'resources/client/dashboard/services/service-form-page.tsx': ['Create a service', 'Publish service'],
    };

    for (const [path, keys] of Object.entries(cases)) {
      const source = readFileSync(resolve(path), 'utf8');
      for (const key of keys) {
        expect(source).toContain(`message="${key}"`);
        expect(lines[key], `Missing Amharic UI translation for ${path}: ${key}`).toBeTruthy();
      }
    }
  });
});
