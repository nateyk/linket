import {CtaSimpleCentered} from '@common/ui/landing-page/cta/cta-simple-centered';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it, vi} from 'vitest';

vi.mock('@ui/i18n/trans', () => ({
  Trans: ({message}: {message: string}) => message,
}));
vi.mock('@common/ui/landing-page/hero/shared', () => ({
  Buttons: ({buttons}: {buttons: {label: string; action: string}[]}) => (
    <div>{buttons.map((b, index) => <a key={index} href={b.action}>{b.label}</a>)}</div>
  ),
}));

const config = {
  name: 'cta-simple-centered' as const,
  title: 'Make something worth sharing',
  description: 'Build your storefront and sell.',
  buttons: [{
    label: 'Create your storefront',
    action: '/register',
    type: 'route' as const,
    variant: 'default' as const,
    color: 'primary' as const,
  }],
};

describe('final CTA background presentation', () => {
  it('uses sparse static SVG stars without changing content and registration action', () => {
    const html = renderToStaticMarkup(
      <CtaSimpleCentered config={{...config, presentation: 'starfield'}} />,
    );

    expect(html).toContain('data-slot="cta-starfield"');
    expect(html.match(/<circle/g)).toHaveLength(26);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('motion-reduce:animate-none');
    expect(html).toContain('bg-linear-to-br');
    expect(html).toContain('Make something worth sharing');
    expect(html).toContain('href="/register"');
    expect(html).not.toContain('canvas');
  });

  it('preserves original quiet CTA for existing saved layouts', () => {
    const html = renderToStaticMarkup(<CtaSimpleCentered config={config} />);

    expect(html).not.toContain('data-slot="cta-starfield"');
    expect(html).toContain('bg-muted/40');
    expect(html).toContain('href="/register"');
  });
});
