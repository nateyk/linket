/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {ImageSelectorDialog} from './image-selector-dialog';

const mocks = vi.hoisted(() => ({
  upload: vi.fn(),
  encode: vi.fn(),
  validate: vi.fn(),
  restrictionError: vi.fn(),
  uploadError: vi.fn(),
}));

vi.mock('@react-stately/utils', () => ({
  useControlledState: (value: boolean | undefined, fallback: boolean, onChange?: (open: boolean) => void) =>
    [value ?? fallback, onChange ?? (() => {})],
}));
vi.mock('@common/uploads/uploader/file-upload-provider', () => ({
  FileUploadProvider: ({children}: {children: React.ReactNode}) => <>{children}</>,
}));
vi.mock('@common/uploads/uploader/use-active-upload', () => ({
  useActiveUpload: () => ({uploadFile: mocks.upload, uploadStatus: 'idle', percentage: 0}),
}));
vi.mock('@common/uploads/uploader/create-file-upload', () => ({
  restrictionsFromConfig: () => ({}),
}));
vi.mock('@common/uploads/utils/encode-cropped-image', () => ({
  encodeCanvasToImageFile: mocks.encode,
  validateEncodedImage: mocks.validate,
  uploadMaxFileSize: () => 4_194_304,
}));
vi.mock('@shadcn/dialog/dialog', () => ({
  Dialog: {
    Root: ({children}: {children: React.ReactNode}) => <>{children}</>,
    Portal: ({children}: {children: React.ReactNode}) => <>{children}</>,
    Backdrop: () => null,
    Content: ({children, className}: {children: React.ReactNode; className?: string}) =>
      <div className={className}>{children}</div>,
    Header: 'header',
    Title: 'h2',
    Description: 'p',
    Body: 'section',
    Footer: 'footer',
    CloseButton: ({children, disabled}: {children: React.ReactNode; disabled?: boolean}) =>
      <button type="button" disabled={disabled}>{children}</button>,
  },
}));
vi.mock('@shadcn/button/button', () => ({
  Button: ({size: _size, variant: _variant, ...props}: React.ButtonHTMLAttributes<HTMLButtonElement> & {size?: string; variant?: string}) =>
    <button {...props} />,
}));
vi.mock('@shadcn/empty/empty', () => ({
  Empty: {Root: 'div', Header: 'div', Media: 'div', Title: 'p', Description: 'p'},
}));
vi.mock('@shadcn/forms/form/hook-form', () => ({
  HookForm: {FieldContext: {Provider: ({children}: {children: React.ReactNode}) => <>{children}</>}},
}));
vi.mock('@shadcn/forms/slider/slider', () => ({
  Slider: Object.assign(
    ({children}: {children: React.ReactNode}) => <div>{children}</div>,
    {
      Label: 'label',
      Control: 'div',
      Track: 'div',
      Indicator: 'div',
      Thumb: ({'aria-label': label}: {'aria-label'?: string}) => <input type="range" aria-label={label} />,
    },
  ),
}));
vi.mock('@shadcn/image-crop/image-crop', () => ({
  cropStageBoxStyle: (aspect: number) => ({aspectRatio: String(aspect), width: '100%'}),
}));
vi.mock('@shadcn/progress/progress', () => ({
  Progress: {Root: 'div', Track: 'div', Indicator: 'div'},
}));
vi.mock('react-easy-crop', () => ({
  default: ({
    crop,
    onCropComplete,
  }: {
    crop: {x: number; y: number};
    onCropComplete: (area: unknown, pixels: unknown) => void;
  }) => (
    <button
      type="button"
      data-testid="cropper"
      data-crop-x={crop.x}
      data-crop-y={crop.y}
      onClick={() =>
        onCropComplete(
          {x: 0, y: 0, width: 90, height: 90},
          {x: 1, y: 2, width: 90, height: 90},
        )
      }
    >
      Choose region
    </button>
  ),
}));
vi.mock('@ui/i18n/message', () => ({message: (text: string) => text}));
vi.mock('@ui/i18n/use-trans', () => ({useTrans: () => ({trans: (text: string) => text})}));
vi.mock('@ui/i18n/trans', () => ({
  Trans: ({message}: {message: string}) => <>{message}</>,
}));
vi.mock('@shadcn/toast/toast', () => ({
  toast: {error: mocks.uploadError},
}));
vi.mock('@ui/toast/toast', () => ({
  toast: {danger: mocks.restrictionError},
}));

const onSelected = vi.fn();
const image = () => new File(['image-data'], 'cover.png', {type: 'image/png'});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.validate.mockReturnValue(null);
  mocks.encode.mockResolvedValue(new File(['cropped-data'], 'cover.webp', {type: 'image/webp'}));
  Object.assign(URL, {
    createObjectURL: vi.fn(() => 'blob:test-image'),
    revokeObjectURL: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderUpload() {
  return render(
    <ImageSelectorDialog uploadType="linkImages" open onSelected={onSelected} />,
  );
}

function chooseImage() {
  const input = screen.getByLabelText('Upload image') as HTMLInputElement;
  fireEvent.change(input, {target: {files: [image()]}});
}

test('empty upload panel accepts an image and shows a ratio-locked crop stage', () => {
  const {container} = renderUpload();
  expect(screen.getByText('Select file to upload or drag-and-drop file')).toBeTruthy();
  chooseImage();
  expect(screen.getByTestId('cropper')).toBeTruthy();
  expect(screen.getByLabelText('Image crop area')).toBeTruthy();
  expect(screen.getByLabelText('Zoom')).toBeTruthy();
  expect(container.querySelector('[role="group"]')?.getAttribute('style')).toContain('aspect-ratio: 1');
  expect(screen.getByRole('button', {name: 'Upload'}).hasAttribute('disabled')).toBe(true);
});

test('rejects non-images and supports actual drag-and-drop selection', () => {
  const {container} = renderUpload();
  const dropzone = container.querySelector('.border-dashed') as HTMLElement;
  fireEvent.change(screen.getByLabelText('Upload image'), {
    target: {files: [new File(['bad'], 'notes.txt', {type: 'text/plain'})]},
  });
  expect(screen.queryByTestId('cropper')).toBeNull();

  fireEvent.dragOver(dropzone);
  fireEvent.drop(dropzone, {dataTransfer: {files: [image()]}});
  expect(screen.getByTestId('cropper')).toBeTruthy();
});

test('keyboard pans the crop, Shift increases the step, Reset restores it', () => {
  renderUpload();
  chooseImage();
  const stage = screen.getByLabelText('Image crop area');
  fireEvent.keyDown(stage, {key: 'ArrowRight'});
  fireEvent.keyDown(stage, {key: 'ArrowDown', shiftKey: true});
  expect(screen.getByTestId('cropper').getAttribute('data-crop-x')).toBe('6');
  expect(screen.getByTestId('cropper').getAttribute('data-crop-y')).toBe('20');

  fireEvent.click(screen.getByTestId('cropper'));
  expect(screen.getByRole('button', {name: 'Upload'}).hasAttribute('disabled')).toBe(false);
  fireEvent.click(screen.getByRole('button', {name: 'Reset'}));
  expect(screen.getByTestId('cropper').getAttribute('data-crop-x')).toBe('0');
  expect(screen.getByTestId('cropper').getAttribute('data-crop-y')).toBe('0');
  expect(screen.getByRole('button', {name: 'Upload'}).hasAttribute('disabled')).toBe(true);
});

test('completed crop uploads the encoded file using the existing callback', async () => {
  renderUpload();
  chooseImage();
  fireEvent.click(screen.getByTestId('cropper'));

  const originalImage = globalThis.Image;
  class LoadedImage {
    onload?: () => void;
    onerror?: () => void;
    set src(_url: string) {
      this.onload?.();
    }
  }
  vi.stubGlobal('Image', LoadedImage);
  const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () => ({drawImage: vi.fn()}) as unknown as CanvasRenderingContext2D,
  );
  try {
    fireEvent.click(screen.getByRole('button', {name: 'Upload'}));
    await waitFor(() => expect(mocks.upload).toHaveBeenCalledTimes(1));
    expect(mocks.upload.mock.calls[0][0]).toBeInstanceOf(File);
    expect(mocks.validate).toHaveBeenCalled();
    expect(mocks.encode).toHaveBeenCalled();
    const options = mocks.upload.mock.calls[0][1];
    options.onSuccess({url: '/images/uploaded.webp'});
    expect(onSelected).toHaveBeenCalledWith('/images/uploaded.webp', expect.anything());
  } finally {
    getContext.mockRestore();
    vi.stubGlobal('Image', originalImage);
  }
});

test('validation errors stop an invalid cropped upload before transfer', async () => {
  renderUpload();
  chooseImage();
  fireEvent.click(screen.getByTestId('cropper'));
  mocks.validate.mockReturnValue('Invalid image');

  const originalImage = globalThis.Image;
  class LoadedImage {
    onload?: () => void;
    set src(_url: string) {
      this.onload?.();
    }
  }
  vi.stubGlobal('Image', LoadedImage);
  const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () => ({drawImage: vi.fn()}) as unknown as CanvasRenderingContext2D,
  );
  try {
    fireEvent.click(screen.getByRole('button', {name: 'Upload'}));
    await waitFor(() => expect(mocks.restrictionError).toHaveBeenCalledWith('Invalid image'));
    expect(mocks.upload).not.toHaveBeenCalled();
  } finally {
    getContext.mockRestore();
    vi.stubGlobal('Image', originalImage);
  }
});
