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

// Controllable ResizeObserver: captures instances so the test can fire
// measurements in the exact order the browser would (mount, then layout).
const roInstances: Array<{trigger: (rect: {width: number; height: number}) => void}> = [];
(globalThis as any).ResizeObserver = class {
  private callback: (entries: Array<{contentRect: {width: number; height: number}}>) => void;
  constructor(callback: any) {
    this.callback = callback;
    roInstances.push({
      trigger: rect => this.callback([{contentRect: rect}]),
    });
  }
  observe() {}
  unobserve() {}
  disconnect() {}
};

// jsdom cannot decode blob URLs; the component only needs an opaque string.
(URL as any).createObjectURL = () => 'blob:fake-test-image';
if (!(URL as any).revokeObjectURL) {
  (URL as any).revokeObjectURL = () => {};
}
if (!(Element.prototype as any).getAnimations) {
  (Element.prototype as any).getAnimations = () => [];
}
if (!(Element.prototype as any).scrollIntoView) {
  (Element.prototype as any).scrollIntoView = () => {};
}

describe('cropper measured window (wiring)', () => {
  test('measured stage drives a full-width engine window', async () => {
    roInstances.length = 0;
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    // 1. mount with no file: placeholder, no stage, no observer demand
    await act(async () => {
      root.render(
        <ImageCrop aspect={16 / 9} file={null} onCrop={() => {}}>
          <ImageCropContent />
        </ImageCrop>,
      );
    });
    expect(container.textContent).toContain('No image selected');

    // 2. file arrives: stage mounts, observer attaches
    const file = new File(['fake-bytes'], 'wide.jpg', {type: 'image/jpeg'});
    await act(async () => {
      root.render(
        <ImageCrop aspect={16 / 9} file={file} onCrop={() => {}}>
          <ImageCropContent />
        </ImageCrop>,
      );
    });
    expect(roInstances.length).toBeGreaterThan(0);

    // 3. browser delivers stage layout: 640x360 dialog stage
    await act(async () => {
      roInstances[roInstances.length - 1].trigger({width: 640, height: 360});
    });

    // 4. image decodes: engine measures media and computes the window
    const cropImg = container.querySelector(
      '.reactEasyCrop_Container img',
    ) as HTMLImageElement | null;
    expect(cropImg, 'engine image rendered').not.toBeNull();
    await act(async () => {
      cropImg!.dispatchEvent(new Event('load'));
    });

    // 5. the rendered crop window fills the inset stage (12px pad each side)
    const cropArea = container.querySelector(
      '[data-testid="cropper"]',
    ) as HTMLElement | null;
    expect(cropArea, 'crop window rendered').not.toBeNull();
    const renderedWidth = Number.parseFloat(cropArea!.style.width);
    expect(
      renderedWidth,
      `window fills inset stage inside 640px (got ${cropArea!.style.width})`,
    ).toBeGreaterThan(580);

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});
