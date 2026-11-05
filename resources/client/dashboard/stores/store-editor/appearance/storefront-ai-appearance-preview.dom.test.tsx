/** @vitest-environment jsdom */
import {render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {StorefrontAiAppearancePreview} from './storefront-ai-appearance-preview';

const fixtures = vi.hoisted(() => ({
  store: {
    biolink: {id: 18},
    appearanceIsDirty: false,
    appearance: {btnConfig: {variant: 'glass', radius: 'rounded-sm', shadow: 'none'}},
  },
  api: {get: vi.fn()},
}));

vi.mock('../biolink-editor-store', () => ({
  useBiolinkEditorStore: (selector: (s: typeof fixtures.store) => unknown) => selector(fixtures.store),
}));
vi.mock('@common/http/query-client', () => ({apiClient: fixtures.api}));

const response = {
  store_id: 18,
  preset: 'calm',
  source_fingerprint: 'a'.repeat(64),
  changes: {btnConfig: {variant: 'outline', radius: 'rounded-sm'}},
  requires_review: true,
  read_only: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  fixtures.store.biolink.id = 18;
  fixtures.store.appearanceIsDirty = false;
  fixtures.api.get.mockImplementation((url: string) =>
    Promise.resolve(url.endsWith('appearance-availability')
      ? {data: {data: {available: true}}}
      : {data: {data: response}}),
  );
});

describe('PR-09 interactive read-only storefront preview', () => {
  it('compares Current vs Suggested without a save or publish action', async () => {
    const user = userEvent.setup();
    render(<StorefrontAiAppearancePreview />);
    const calm = await screen.findByRole('button', {name: 'Calm'});
    await user.click(calm);
    expect(await screen.findByLabelText('Before and after comparison')).toBeTruthy();
    expect(screen.getByText('Current')).toBeTruthy();
    expect(screen.getByText('Suggested')).toBeTruthy();
    expect(screen.getAllByText('Sample action')).toHaveLength(2);
    expect(calm.getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryByRole('button', {name: /Apply|Save|Publish/i})).toBeNull();
    expect(fixtures.api.get).toHaveBeenCalledWith(
      '/api/v1/creator-ai/stores/18/appearance-preview', {params: {preset: 'calm'}},
    );
    await user.click(screen.getByRole('button', {name: 'Dismiss preview'}));
    expect(screen.queryByLabelText('Before and after comparison')).toBeNull();
  });

  it('fails closed when availability denies Pro access', async () => {
    fixtures.api.get.mockResolvedValue({data: {data: {available: false}}});
    render(<StorefrontAiAppearancePreview />);
    await waitFor(() => expect(fixtures.api.get).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('button', {name: 'Calm'})).toBeNull();
    expect(screen.queryByLabelText('Before and after comparison')).toBeNull();
  });

  it('announces service errors and permits a safe retry', async () => {
    const user = userEvent.setup();
    fixtures.api.get.mockImplementation((url: string) =>
      url.endsWith('appearance-availability')
        ? Promise.resolve({data: {data: {available: true}}})
        : Promise.reject({response: {status: 403}}),
    );
    render(<StorefrontAiAppearancePreview />);
    const clear = await screen.findByRole('button', {name: 'Clear'});
    await user.click(clear);
    expect((await screen.findByRole('alert')).textContent).toMatch(/Pro plan/i);
    expect(clear.hasAttribute('disabled')).toBe(false);
    expect(screen.queryByLabelText('Before and after comparison')).toBeNull();
  });

  it('ignores a delayed preview response after changing stores', async () => {
    const user = userEvent.setup();
    let complete!: (value: unknown) => void;
    fixtures.api.get.mockImplementation((url: string) => {
      if (url.endsWith('appearance-availability')) {
        return Promise.resolve({data: {data: {available: true}}});
      }
      return new Promise(resolve => { complete = resolve; });
    });
    const view = render(<StorefrontAiAppearancePreview />);
    await user.click(await screen.findByRole('button', {name: 'Profile'}));
    fixtures.store.biolink.id = 19;
    view.rerender(<StorefrontAiAppearancePreview />);
    complete({data: {data: response}});
    await waitFor(() => expect(fixtures.api.get).toHaveBeenCalledWith(
      '/api/v1/creator-ai/stores/19/appearance-availability',
    ));
    expect(screen.queryByLabelText('Before and after comparison')).toBeNull();
  });
});
