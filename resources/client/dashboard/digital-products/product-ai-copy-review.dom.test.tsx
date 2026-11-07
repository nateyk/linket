/** @vitest-environment jsdom */
import {render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {ProductAiCopyReview} from './product-ai-copy-review';

const api = vi.hoisted(() => ({get: vi.fn(), post: vi.fn()}));
vi.mock('@common/http/query-client', () => ({apiClient: api}));

const productId = 212;
const path = '/api/v1/creator-ai/products/' + productId;
const suggested = {
  title: 'Improved workbook title',
  description: 'Includes printable practice sheets.',
  source_fingerprint: 'a'.repeat(64),
};

function mount(props: {
  description?: string;
  use?: (text: string) => void;
} = {}) {
  const onUse = props.use ?? vi.fn();
  const currentDescription = props.description ?? 'Existing copy';
  return {
    ...render(
      <ProductAiCopyReview
        productId={productId}
        currentTitle="Existing title"
        currentDescription={currentDescription}
        onUseDescription={onUse}
      />,
    ),
    onUse,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  api.get.mockResolvedValue({data: {data: {available: true}}});
});

describe('AI product-copy review interaction', () => {
  it('supports explicit preview, editable text, keyboard dismissal and focus return', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValueOnce({data: {data: suggested}});
    const onUse = vi.fn();
    mount({use: onUse});
    const generate = await screen.findByRole('button', {name: /Suggest copy/i});
    await user.click(generate);
    const textbox = await screen.findByRole('textbox', {name: /Suggested description/i});
    expect(textbox.getAttribute('aria-describedby')).toBeTruthy();
    expect(document.activeElement).toBe(textbox);

    await user.clear(textbox);
    await user.type(textbox, 'Edited by the creator.');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('textbox', {name: /Suggested description/i})).toBeNull());
    expect(document.activeElement).toBe(generate);
    expect(onUse).not.toHaveBeenCalled();
    expect(api.post).toHaveBeenCalledTimes(1);
  });

  it('verifies the revision before inserting only into the local editor, never saving a product', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValueOnce({data: {data: suggested}});
    api.post.mockResolvedValueOnce({data: {data: {unchanged: true}}});
    const onUse = vi.fn();
    mount({use: onUse});
    await user.click(await screen.findByRole('button', {name: /Suggest copy/i}));
    const input = await screen.findByRole('textbox', {name: /Suggested description/i});
    await user.clear(input);
    await user.type(input, 'Updated local wording');
    await user.click(screen.getByRole('button', {name: /Use description/i}));
    await waitFor(() => expect(onUse).toHaveBeenCalledWith('Updated local wording'));
    expect(api.post).toHaveBeenNthCalledWith(1, path + '/copy-proposals', {
      tone: 'clear',
      language: 'en',
    });
    expect(api.post).toHaveBeenNthCalledWith(2, path + '/copy-revision', {
      source_fingerprint: suggested.source_fingerprint,
    });
    expect(screen.queryByRole('textbox', {name: /Suggested description/i})).toBeNull();
  });

  it('announces quota errors without losing the ability to retry', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValueOnce({response: {status: 429}});
    api.post.mockResolvedValueOnce({data: {data: suggested}});
    mount();
    const generate = await screen.findByRole('button', {name: /Suggest copy/i});
    await user.click(generate);
    const error = await screen.findByRole('alert');
    expect(error.textContent).toMatch(/quota|budget/i);
    expect(generate.hasAttribute('disabled')).toBe(false);
    await user.click(generate);
    expect(await screen.findByRole('textbox', {name: /Suggested description/i})).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('refuses to overwrite a locally modified description after a proposal', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValueOnce({data: {data: suggested}});
    const onUse = vi.fn();
    const renderResult = mount({use: onUse});
    await user.click(await screen.findByRole('button', {name: /Suggest copy/i}));
    await screen.findByRole('textbox', {name: /Suggested description/i});
    renderResult.rerender(
      <ProductAiCopyReview
        productId={productId}
        currentTitle="Existing title"
        currentDescription="Edited in a different field"
        onUseDescription={onUse}
      />,
    );
    await user.click(screen.getByRole('button', {name: /Use description/i}));
    expect((await screen.findByRole('alert')).textContent).toMatch(/changed/i);
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(onUse).not.toHaveBeenCalled();
  });

  it('keeps the suggestion visible when server revision verification returns 409', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValueOnce({data: {data: suggested}});
    api.post.mockRejectedValueOnce({response: {status: 409}});
    const onUse = vi.fn();
    mount({use: onUse});
    await user.click(await screen.findByRole('button', {name: /Suggest copy/i}));
    await screen.findByRole('textbox', {name: /Suggested description/i});
    await user.click(screen.getByRole('button', {name: /Use description/i}));
    expect((await screen.findByRole('alert')).textContent).toMatch(/changed/i);
    expect(screen.getByRole('textbox', {name: /Suggested description/i})).toBeTruthy();
    expect(onUse).not.toHaveBeenCalled();
  });

  it('does not show an action when API availability is denied', async () => {
    api.get.mockResolvedValueOnce({data: {data: {available: false}}});
    mount();
    await waitFor(() => expect(api.get).toHaveBeenCalledWith(path + '/copy-availability'));
    expect(screen.queryByRole('button', {name: /Suggest copy/i})).toBeNull();
  });
});
