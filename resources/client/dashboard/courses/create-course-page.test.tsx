import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

const source = fs.readFileSync(
  path.resolve('resources/client/dashboard/courses/create-course-page.tsx'),
  'utf8',
);

describe('course creation page', () => {
  test('reads billing and price through the shared prefill parser', () => {
    expect(source).toContain('parseWizardPrefill');
    expect(source).not.toContain("searchParams.get('price_cents')");
  });

  test('renders breadcrumb and shared form primitives', () => {
    expect(source).toContain("from '@shadcn/breadcrumb/breadcrumb'");
    expect(source).toContain('<Breadcrumb');
    expect(source).toContain('All products');
    expect(source).toContain('<ProductFormField');
    expect(source).toContain('aria-invalid');
  });

  test('shows a Free badge instead of a price field for free billing', () => {
    expect(source).toContain('<Badge');
    expect(source).toContain("billing === 'free'");
  });

  test('keeps spinner submit state and uncertain-creation recovery', () => {
    expect(source).toContain('<Spinner');
    expect(source).toContain('creationUncertain');
    expect(source).toContain('Check My Products');
  });

  test('labels static copy through Trans', () => {
    expect(source).toContain('<Trans message="Create course" />');
    expect(source).toContain('label="Course title"');
    expect(source).toContain('label="Price"');
    expect(source).not.toContain("setError('Add a course title");
  });
});
