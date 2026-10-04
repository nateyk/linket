/**
 * @vitest-environment jsdom
 */
import {act, render, waitFor} from '@testing-library/react';
import {expect, test, vi, beforeAll} from 'vitest';
import {useForm, UseFormReturn} from 'react-hook-form';

// jsdom has no layout: ProseMirror queries Range rects while its view mounts.
beforeAll(() => {
  const emptyRect: DOMRect = {
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
    toJSON: () => ({}),
  };
  Range.prototype.getBoundingClientRect = () => emptyRect;
  Range.prototype.getClientRects = () =>
    ({
      length: 0,
      item: () => null,
      [Symbol.iterator]: function* () {},
    }) as unknown as DOMRectList;
});

import {renderAboutHtml} from '@app/short-links/renderers/biolink-renderer/about-markdown';
import {STORE_3006_ABOUT_HTML} from '@app/short-links/renderers/biolink-renderer/store-3006-about.fixture';
import {CreatorAboutEditor} from './creator-about-editor';
import {
  CreatorProfileForm,
  rebaseAboutFormOnEditorReady,
} from './creator-profile-form-values';

type FormRef = {current: UseFormReturn<CreatorProfileForm> | null};

/** Mirrors the pristine-form wiring the profile editor uses (A-01). */
function AboutHarness({
  initialAbout,
  formRef,
  withEditor = true,
}: {
  initialAbout: string;
  formRef: FormRef;
  withEditor?: boolean;
}) {
  const form = useForm<CreatorProfileForm>({
    defaultValues: {about_html: initialAbout, skills: ''},
  });
  const values = form.watch();
  // Reading formState during render subscribes the output to dirty changes.
  const isDirty = form.formState.isDirty;
  formRef.current = form;

  if (!withEditor) {
    return <output data-dirty={String(isDirty)} />;
  }

  return (
    <>
      <output data-dirty={String(isDirty)} />
      <CreatorAboutEditor
        value={values.about_html || ''}
        onChange={aboutHtml =>
          form.setValue('about_html', aboutHtml, {shouldDirty: true})
        }
        onEditorReady={canonicalHtml =>
          rebaseAboutFormOnEditorReady(form, values.about_html, canonicalHtml)
        }
      />
    </>
  );
}

test('opening the About editor on a pristine form keeps it pristine', async () => {
  const normalized = renderAboutHtml(STORE_3006_ABOUT_HTML);
  const formRef: FormRef = {current: null};
  render(<AboutHarness initialAbout={normalized} formRef={formRef} />);

  // Give TipTap time to create, reconcile its serialization and (without the
  // rebase) mark the field dirty through onChange.
  await act(() => new Promise<void>(resolve => setTimeout(resolve, 300)));
  await waitFor(() =>
    expect(
      document.querySelector('output')?.getAttribute('data-dirty'),
    ).toBe('false'),
  );

  // ...and a real user edit afterwards still marks the form dirty.
  await act(async () => {
    formRef.current!.setValue('about_html', '<p>edited by user</p>', {
      shouldDirty: true,
    });
  });
  await waitFor(() =>
    expect(document.querySelector('output')?.getAttribute('data-dirty')).toBe(
      'true',
    ),
  );
});

test('the rebase never wipes dirtiness that already exists', async () => {
  const formRef: FormRef = {current: null};
  render(
    <AboutHarness initialAbout="<p>old</p>" formRef={formRef} withEditor={false} />,
  );

  await act(async () => {
    formRef.current!.setValue('bio', 'edited in another field', {
      shouldDirty: true,
    });
  });
  expect(
    document.querySelector('output')?.getAttribute('data-dirty'),
  ).toBe('true');

  act(() => {
    rebaseAboutFormOnEditorReady(formRef.current!, '<p>old</p>', '<p>canonical</p>');
  });

  expect(
    document.querySelector('output')?.getAttribute('data-dirty'),
  ).toBe('true');
  expect(formRef.current!.getValues('bio')).toBe('edited in another field');
});

test('identical round-trip is a no-op (no reset on byte-stable mounts)', async () => {
  const formRef: FormRef = {current: null};
  render(
    <AboutHarness initialAbout="<p>same</p>" formRef={formRef} withEditor={false} />,
  );
  const form = formRef.current!;
  const resetSpy = vi.spyOn(form, 'reset');

  rebaseAboutFormOnEditorReady(form, '<p>same</p>', '<p>same</p>');
  expect(resetSpy).not.toHaveBeenCalled();

  // A differing canonical form on a pristine form does rebase.
  rebaseAboutFormOnEditorReady(form, '<p>same</p>', '<p>canonical</p>');
  expect(resetSpy).toHaveBeenCalledTimes(1);
  expect(form.getValues('about_html')).toBe('<p>canonical</p>');
});
