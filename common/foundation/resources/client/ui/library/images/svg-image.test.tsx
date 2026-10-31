// @vitest-environment jsdom
import {describe, expect, it} from 'vitest';
import {render, screen} from '@testing-library/react';
import {SvgImage} from './svg-image';

describe('SvgImage security boundary', () => {
  it('renders SVG as a passive image resource rather than injecting markup', () => {
    const {container} = render(
      <SvgImage src="/images/safety-check.svg" className="test-svg" />,
    );
    const img = screen.getByRole('img', {name: ''});
    expect(img.getAttribute('src')).toBe('/images/safety-check.svg');
    expect(container.querySelector('svg')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('[onload]')).toBeNull();
  });
});
