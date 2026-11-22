/** @vitest-environment jsdom */
import {cleanup, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import {Badge} from './badge';

afterEach(cleanup);

describe('Badge component', () => {
  it('renders default variant', () => {
    render(<Badge>Default</Badge>);
    const badge = screen.getByText('Default');
    expect(badge.className).toContain('bg-primary');
  });

  it('renders warning variant', () => {
    render(<Badge variant="warning">Warning</Badge>);
    const badge = screen.getByText('Warning');
    expect(badge.className).toContain('text-warning');
    expect(badge.className).toContain('bg-warning/10');
  });

  it('supports color prop as variant alias', () => {
    render(<Badge color="positive">Positive</Badge>);
    const badge = screen.getByText('Positive');
    expect(badge.className).toContain('text-positive');
    expect(badge.className).toContain('bg-positive/10');
  });

  it('renders with custom className', () => {
    render(<Badge className="custom-test-class">Custom</Badge>);
    const badge = screen.getByText('Custom');
    expect(badge.className).toContain('custom-test-class');
  });
});
