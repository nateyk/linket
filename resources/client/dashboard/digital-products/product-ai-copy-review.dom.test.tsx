/** @vitest-environment jsdom */
import {act, render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {ProductAiCopyReview} from './product-ai-copy-review';

const api = vi.hoisted(() => ({get: vi.fn(), post: vi.fn(), patch: vi.fn()}));
vi.mock('@common/http/query-client', () => ({apiClient: api}));

const productId = 212;
const path = '/api/v1/creator-ai/products/' + productId;
const suggested = {
  title: 'Improved workbook title',
  description: 'Includes printable practice sheets.',
  source_fingerprint: 'a'.repeat(64),
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return {promise, resolve, reject};
}

function mount(
  props: {
    description?: string;
    use?: (text: string) => void;
  } = {},
) {
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
  it.each(['generation', 'verification'] as const)(
    'ignores a rejected %s request after switching products',
    async phase => {
      const user = userEvent.setup();
      const pending = deferred<unknown>();
      if (phase === 'verification') {
        api.post.mockResolvedValueOnce({data: {data: suggested}});
      }
      api.post.mockReturnValueOnce(pending.promise);
      const result = mount();
      await user.click(
        await screen.findByRole('button', {name: /Suggest copy/i}),
      );
      if (phase === 'verification') {
        await user.click(
          await screen.findByRole('button', {name: /^Apply$/i}),
        );
      }
      result.rerender(
        <ProductAiCopyReview
          productId={213}
          currentTitle="Existing title"
          currentDescription="Existing copy"
          onUseDescription={result.onUse}
        />,
      );
      await screen.findByRole('button', {name: /Suggest copy/i});
      await act(async () => pending.reject({response: {status: 503}}));
      expect(screen.queryByRole('alert')).toBeNull();
      expect(screen.queryByRole('textbox')).toBeNull();
      expect(result.onUse).not.toHaveBeenCalled();
    },
  );

  it.each(['generation', 'verification'] as const)(
    'preserves source edits made while %s is pending',
    async phase => {
      const user = userEvent.setup();
      const pending = deferred<unknown>();
      if (phase === 'verification') {
        api.post.mockResolvedValueOnce({data: {data: suggested}});
      }
      api.post.mockReturnValueOnce(pending.promise);
      const result = mount();
      await user.click(
        await screen.findByRole('button', {name: /Suggest copy/i}),
      );
      if (phase === 'verification') {
        await user.click(
          await screen.findByRole('button', {name: /^Apply$/i}),
        );
      }
      result.rerender(
        <ProductAiCopyReview
          productId={productId}
          currentTitle="Edited title"
          currentDescription="Edited description"
          onUseDescription={result.onUse}
        />,
      );
      await act(async () =>
        pending.resolve({
          data: {data: phase === 'generation' ? suggested : {unchanged: true}},
        }),
      );
      expect(result.onUse).not.toHaveBeenCalled();
      expect((await screen.findByRole('alert')).textContent).toMatch(/edited/i);
    },
  );
  it('ignores a generation response from a previous product and lets the new product generate', async () => {
    const user = userEvent.setup();
    const pending = deferred<{data: {data: typeof suggested}}>();
    api.post.mockReturnValueOnce(pending.promise);
    const result = mount();
    await user.click(
      await screen.findByRole('button', {name: /Suggest copy/i}),
    );
    result.rerender(
      <ProductAiCopyReview
        productId={213}
        currentTitle="Existing title"
        currentDescription="Existing copy"
        onUseDescription={result.onUse}
      />,
    );
    await screen.findByRole('button', {name: /Suggest copy/i});
    await act(async () => pending.resolve({data: {data: suggested}}));
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(
      screen
        .getByRole('button', {name: /Suggest copy/i})
        .hasAttribute('disabled'),
    ).toBe(false);
    expect(result.onUse).not.toHaveBeenCalled();
  });

  it('does not apply a verified suggestion after switching products', async () => {
    const user = userEvent.setup();
    const pending = deferred<unknown>();
    api.post
      .mockResolvedValueOnce({data: {data: suggested}})
      .mockReturnValueOnce(pending.promise);
    const result = mount();
    await user.click(
      await screen.findByRole('button', {name: /Suggest copy/i}),
    );
    await user.click(
      await screen.findByRole('button', {name: /^Apply$/i}),
    );
    result.rerender(
      <ProductAiCopyReview
        productId={213}
        currentTitle="Existing title"
        currentDescription="Existing copy"
        onUseDescription={result.onUse}
      />,
    );
    await screen.findByRole('button', {name: /Suggest copy/i});
    await act(async () => pending.resolve({data: {data: {unchanged: true}}}));
    expect(result.onUse).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('keeps a discarded suggestion discarded when revision verification finishes', async () => {
    const user = userEvent.setup();
    const pending = deferred<unknown>();
    api.post
      .mockResolvedValueOnce({data: {data: suggested}})
      .mockReturnValueOnce(pending.promise);
    const {onUse} = mount();
    await user.click(
      await screen.findByRole('button', {name: /Suggest copy/i}),
    );
    const textbox = await screen.findByRole('textbox');
    await user.click(screen.getByRole('button', {name: /^Apply$/i}));
    await user.click(textbox);
    await user.keyboard('{Escape}');
    await act(async () => pending.resolve({data: {data: {unchanged: true}}}));
    expect(onUse).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect((await screen.findByRole('status')).textContent).toMatch(
      /discarded/i,
    );
  });

  it('refuses text edited after the creator clicked Use description', async () => {
    const user = userEvent.setup();
    const pending = deferred<unknown>();
    api.post
      .mockResolvedValueOnce({data: {data: suggested}})
      .mockReturnValueOnce(pending.promise);
    const {onUse} = mount();
    await user.click(
      await screen.findByRole('button', {name: /Suggest copy/i}),
    );
    const textbox = await screen.findByRole('textbox');
    await user.click(screen.getByRole('button', {name: /^Apply$/i}));
    await user.type(textbox, ' New text not approved yet.');
    await act(async () => pending.resolve({data: {data: {unchanged: true}}}));
    expect(onUse).not.toHaveBeenCalled();
    expect((await screen.findByRole('alert')).textContent).toMatch(
      /changed|edited/i,
    );
  });

  it('cancels a pending generation and ignores its response without unlocking a newer request', async () => {
    const user = userEvent.setup();
    const first = deferred<{data: {data: typeof suggested}}>();
    const second = deferred<{data: {data: typeof suggested}}>();
    api.post
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    mount();
    await user.click(
      await screen.findByRole('button', {name: /Suggest copy/i}),
    );
    await user.click(screen.getByRole('button', {name: /Cancel request/i}));
    await user.click(screen.getByRole('button', {name: /Suggest copy/i}));
    await act(async () => first.resolve({data: {data: suggested}}));
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(
      screen.getByRole('button', {name: /Working/i}).hasAttribute('disabled'),
    ).toBe(true);
    await act(async () =>
      second.resolve({
        data: {data: {...suggested, description: 'Current suggestion.'}},
      }),
    );
    expect(
      ((await screen.findByRole('textbox')) as HTMLTextAreaElement).value,
    ).toBe('Current suggestion.');
  });

  it('reports successful insertion and prevents duplicate use of the same suggestion', async () => {
    const user = userEvent.setup();
    api.post
      .mockResolvedValueOnce({data: {data: suggested}})
      .mockResolvedValueOnce({data: {data: {unchanged: true}}});
    const {onUse} = mount();
    await user.click(
      await screen.findByRole('button', {name: /Suggest copy/i}),
    );
    await user.dblClick(
      await screen.findByRole('button', {name: /^Apply$/i}),
    );
    expect(onUse).toHaveBeenCalledExactlyOnceWith(
      suggested.description,
      suggested.source_fingerprint,
      undefined,
    );
    expect((await screen.findByRole('status')).textContent).toMatch(
      /added to the editor/i,
    );
    expect(screen.getByRole('button', {name: /Suggest copy/i})).toBe(
      document.activeElement,
    );
    expect(api.post).toHaveBeenCalledTimes(2);
  });
  it('supports explicit preview, editable text, keyboard dismissal and focus return', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValueOnce({data: {data: suggested}});
    const onUse = vi.fn();
    mount({use: onUse});
    const generate = await screen.findByRole('button', {name: /Suggest copy/i});
    await user.click(generate);
    const textbox = await screen.findByRole('textbox', {
      name: /Suggested description/i,
    });
    expect(textbox.getAttribute('aria-describedby')).toBeTruthy();
    expect(document.activeElement).toBe(textbox);

    await user.clear(textbox);
    await user.type(textbox, 'Edited by the creator.');
    await user.keyboard('{Escape}');
    await waitFor(() =>
      expect(
        screen.queryByRole('textbox', {name: /Suggested description/i}),
      ).toBeNull(),
    );
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
    await user.click(
      await screen.findByRole('button', {name: /Suggest copy/i}),
    );
    const input = await screen.findByRole('textbox', {
      name: /Suggested description/i,
    });
    await user.clear(input);
    await user.type(input, 'Updated local wording');
    await user.click(screen.getByRole('button', {name: /^Apply$/i}));
    await waitFor(() =>
      expect(onUse).toHaveBeenCalledWith(
        'Updated local wording',
        suggested.source_fingerprint,
      undefined,
      ),
    );
    expect(api.post).toHaveBeenNthCalledWith(1, path + '/copy-proposals', {
      tone: 'clear',
      language: 'en',
    });
    expect(api.post).toHaveBeenNthCalledWith(2, path + '/copy-revision', {
      source_fingerprint: suggested.source_fingerprint,
      undefined,
    });
    expect(
      screen.queryByRole('textbox', {name: /Suggested description/i}),
    ).toBeNull();
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
    expect(
      await screen.findByRole('textbox', {name: /Suggested description/i}),
    ).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('refuses to overwrite a locally modified description after a proposal', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValueOnce({data: {data: suggested}});
    const onUse = vi.fn();
    const renderResult = mount({use: onUse});
    await user.click(
      await screen.findByRole('button', {name: /Suggest copy/i}),
    );
    await screen.findByRole('textbox', {name: /Suggested description/i});
    renderResult.rerender(
      <ProductAiCopyReview
        productId={productId}
        currentTitle="Existing title"
        currentDescription="Edited in a different field"
        onUseDescription={onUse}
      />,
    );
    await user.click(screen.getByRole('button', {name: /^Apply$/i}));
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
    await user.click(
      await screen.findByRole('button', {name: /Suggest copy/i}),
    );
    await screen.findByRole('textbox', {name: /Suggested description/i});
    await user.click(screen.getByRole('button', {name: /^Apply$/i}));
    expect((await screen.findByRole('alert')).textContent).toMatch(/changed/i);
    expect(
      screen.getByRole('textbox', {name: /Suggested description/i}),
    ).toBeTruthy();
    expect(onUse).not.toHaveBeenCalled();
  });

  it('does not show an action when API availability is denied', async () => {
    api.get.mockResolvedValueOnce({data: {data: {available: false}}});
    mount();
    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith(path + '/copy-availability'),
    );
    expect(screen.queryByRole('button', {name: /Suggest copy/i})).toBeNull();
  });
});

function persistedDraft() {
  return {...suggested, draft_id: '8ab61a95-2f37-4ae0-86ed-17e2d76d6933', draft_version: 0, state: 'proposed'};
}

it('reopens private review edits after remount without generating again', async () => {
  const saved = {...persistedDraft(), description: 'Previously saved creator text.'};
  api.get.mockImplementation((url: string) => Promise.resolve({data: {data: url.endsWith('/copy-drafts') ? saved : {available: true}}}));
  const first = mount();
  expect((await screen.findByRole('textbox') as HTMLTextAreaElement).value).toBe(saved.description);
  first.unmount();
  mount();
  expect((await screen.findByRole('textbox') as HTMLTextAreaElement).value).toBe(saved.description);
  expect(api.post).not.toHaveBeenCalled();
});

it('saves edited private text and passes its version to normal product saving only after Apply', async () => {
  const user = userEvent.setup();
  const saved = persistedDraft();
  api.get.mockImplementation((url: string) => Promise.resolve({data: {data: url.endsWith('/copy-drafts') ? saved : {available: true}}}));
  api.patch.mockImplementation((_url: string, body: {description: string; version: number}) => Promise.resolve({data: {data: {...saved, description: body.description, draft_version: body.version + 1, state: 'reviewed'}}}));
  api.post.mockResolvedValue({data: {data: {unchanged: true}}});
  const {onUse} = mount();
  const textarea = await screen.findByRole('textbox');
  await user.clear(textarea);
  await user.type(textarea, 'My edited suggestion.');
  await user.click(screen.getByRole('button', {name: 'Save private draft'}));
  await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/Private review saved/));
  expect(onUse).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', {name: 'Apply'}));
  await waitFor(() => expect(onUse).toHaveBeenCalledExactlyOnceWith('My edited suggestion.', suggested.source_fingerprint, {draftId: saved.draft_id, draftVersion: 2}));
  expect(screen.getByRole('status').textContent).toMatch(/Await the product Saved confirmation/);
});

it.each(['review', 'discard'] as const)('keeps creator text and announces a failed %s request', async action => {
  const user = userEvent.setup();
  const saved = persistedDraft();
  api.get.mockImplementation((url: string) => Promise.resolve({data: {data: url.endsWith('/copy-drafts') ? saved : {available: true}}}));
  api.patch.mockRejectedValue({response: {status: 409}});
  api.post.mockRejectedValue({response: {status: 503}});
  const {onUse} = mount();
  const textarea = await screen.findByRole('textbox');
  await user.clear(textarea);
  await user.type(textarea, 'Keep my local text.');
  await user.click(screen.getByRole('button', {name: action === 'review' ? 'Save private draft' : 'Discard'}));
  await screen.findByRole('alert');
  expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('Keep my local text.');
  expect(onUse).not.toHaveBeenCalled();
});

it('supports keyboard discard, announces persistence and restores trigger focus', async () => {
  const user = userEvent.setup();
  const saved = persistedDraft();
  api.get.mockImplementation((url: string) => Promise.resolve({data: {data: url.endsWith('/copy-drafts') ? saved : {available: true}}}));
  api.post.mockResolvedValue({data: {data: {...saved, state: 'discarded'}}});
  const {onUse} = mount();
  const textarea = await screen.findByRole('textbox');
  expect(document.activeElement).toBe(textarea);
  await user.keyboard('{Escape}');
  await waitFor(() => expect(screen.queryByRole('textbox')).toBeNull());
  expect(screen.getByRole('status').textContent).toMatch(/discarded/);
  expect(document.activeElement).toBe(screen.getByRole('button', {name: 'Suggest copy'}));
  expect(api.post).toHaveBeenCalledWith(path + '/copy-drafts/' + saved.draft_id + '/discard', {version: 0});
  expect(onUse).not.toHaveBeenCalled();
});
