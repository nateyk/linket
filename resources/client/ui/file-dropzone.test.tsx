import {describe, expect, test, vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {FileDropzone} from '@common/ui/file-dropzone';

vi.mock('@ui/i18n/trans', () => ({
  Trans: ({message, children}: any) => (
    <>{typeof message === 'string' ? message : children}</>
  ),
}));

describe('FileDropzone', () => {
  test('renders title and browse button', () => {
    const html = renderToStaticMarkup(
      <FileDropzone title="Upload attachment" onFile={() => {}} />,
    );
    expect(html).toContain('Upload attachment');
    expect(html).toContain('Browse files');
  });

  test('shows progress bar while uploading', () => {
    const html = renderToStaticMarkup(
      <FileDropzone
        title="Upload"
        onFile={() => {}}
        status="uploading"
        progress={42}
      />,
    );
    expect(html).toContain('Uploading...');
    expect(html).toContain('width:42%');
  });

  test('does not show progress when idle', () => {
    const html = renderToStaticMarkup(
      <FileDropzone title="Upload" onFile={() => {}} />,
    );
    expect(html).not.toContain('Uploading...');
    expect(html).not.toContain('width:');
  });
});
