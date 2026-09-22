// @vitest-environment jsdom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {describe, expect, test, vi} from 'vitest';
import {
  ImageCrop,
  ImageCropContent,
} from '@shadcn/image-crop/image-crop';

vi.mock('@ui/i18n/trans', () => ({
  Trans: ({message, children}: any) => (
    <>{typeof message === 'string' ? message : children}</>
  ),
}));

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

if (!(globalThis as any).ResizeObserver) {
  (globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// jsdom's URL.createObjectURL cannot handle File objects; the component only
// needs an opaque URL string to render the stage, so stub unconditionally.
(URL as any).createObjectURL = () => 'blob:fake-test-image';
if (!(URL as any).revokeObjectURL) {
  (URL as any).revokeObjectURL = () => {};
}

// jsdom gaps used by Base UI primitives: stub once per file.
if (!(Element.prototype as any).getAnimations) {
  (Element.prototype as any).getAnimations = () => [];
}
if (!(Element.prototype as any).scrollIntoView) {
  (Element.prototype as any).scrollIntoView = () => {};
}

function click(element: Element | null) {
  if (!element) throw new Error('click target not found');
  for (const type of ['pointerdown', 'mousedown', 'mouseup', 'click']) {
    element.dispatchEvent(new MouseEvent(type, {bubbles: true}));
  }
}

async function waitForOption(label: string) {
  return vi.waitFor(
    () => {
      const option = Array.from(
        document.body.querySelectorAll('[role="option"]'),
      ).find(node => node.textContent === label);
      if (!option) throw new Error(`option ${label} not open yet`);
      return option;
    },
    {timeout: 3000},
  );
}

describe('cropper aspect select (interactive)', () => {
  test('switching 16:9 to 1:1 updates the trigger through context state', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const file = new File(['fake-bytes'], 'tall.jpg', {type: 'image/jpeg'});

    await act(async () => {
      root.render(
        <ImageCrop aspect={16 / 9} file={file} onCrop={() => {}}>
          <ImageCropContent />
        </ImageCrop>,
      );
    });

    // crop stage rendered with the zoom slider
    expect(container.textContent).toContain('Zoom');
    // aspect select shows the initial 16:9 value
    const trigger = Array.from(container.querySelectorAll('button')).find(
      button => button.textContent?.includes('16:9'),
    );
    expect(trigger, 'aspect trigger showing 16:9').toBeDefined();

    // open the select and pick 1:1 (Square); Base UI renders options in a
    // portal after positioning, so poll for them
    await act(async () => {
      click(trigger ?? null);
    });
    const option = await waitForOption('1:1 (Square)');
    await act(async () => {
      click(option);
    });

    // trigger now reflects the new ratio: state flowed through context
    await vi.waitFor(() => {
      const updated = Array.from(container.querySelectorAll('button')).find(
        button => button.textContent?.includes('1:1 (Square)'),
      );
      if (!updated) throw new Error('trigger not updated yet');
    });

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});
