import {describe, expect, test} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {StatCard} from '@common/ui/stat-card';

describe('StatCard', () => {
  test('renders label and value', () => {
    const html = renderToStaticMarkup(
      <StatCard label="Chapters" value={3} icon={<span data-testid="ic" />} />,
    );
    expect(html).toContain('Chapters');
    expect(html).toContain('>3<');
  });

  test('renders hint when provided', () => {
    const html = renderToStaticMarkup(
      <StatCard label="Published" value={2} hint="50% published" />,
    );
    expect(html).toContain('50% published');
  });

  test('omits hint when not provided', () => {
    const html = renderToStaticMarkup(<StatCard label="Lessons" value={5} />);
    expect(html).not.toContain('mt-1 text-xs');
  });
});
