import {describe, expect, test, vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {SharedFileUploader} from '@common/ui/file-uploader';
import {
  applyUploadError,
  applyUploadProgress,
  clearUploadItem,
  formatUploadSize,
  validateUploadFile,
  type UploadItem,
} from '@common/ui/file-uploader';
import {Attachment} from '@shadcn/attachment/attachment';

vi.mock('@ui/i18n/trans', () => ({
  Trans: ({message, children}: any) => (
    <>{typeof message === 'string' ? message : children}</>
  ),
}));

vi.mock('@ui/toast/toast', () => ({
  toast: Object.assign(() => {}, {
    danger: () => {},
    positive: () => {},
    loading: () => {},
  }),
}));

describe('formatUploadSize', () => {
  test('formats bytes, KB and MB', () => {
    expect(formatUploadSize(512)).toContain('B');
    expect(formatUploadSize(2048)).toContain('KB');
    expect(formatUploadSize(5 * 1024 * 1024)).toContain('MB');
  });
});

describe('validateUploadFile', () => {
  test('rejects unsupported type', () => {
    const error = validateUploadFile(
      {name: 'evil.exe', size: 1000, type: 'application/x-msdownload'},
      {
        allowedFileTypes: ['application/pdf', 'image/png'],
        maxFileSize: 1024 * 1024,
      },
    );
    expect(error).toBeTruthy();
  });

  test('rejects oversize file', () => {
    const error = validateUploadFile(
      {name: 'big.pdf', size: 200 * 1024 * 1024, type: 'application/pdf'},
      {allowedFileTypes: ['application/pdf'], maxFileSize: 100 * 1024 * 1024},
    );
    expect(error).toBeTruthy();
  });

  test('accepts valid file', () => {
    const error = validateUploadFile(
      {name: 'doc.pdf', size: 1024, type: 'application/pdf'},
      {
        allowedFileTypes: ['application/pdf'],
        maxFileSize: 100 * 1024 * 1024,
      },
    );
    expect(error).toBeUndefined();
  });
});

describe('SharedFileUploader', () => {
  test('renders dropzone with title and browse affordance', () => {
    const html = renderToStaticMarkup(
      <SharedFileUploader
        uploadType="digitalProductFiles"
        onUploaded={() => {}}
      />,
    );
    expect(html).toContain('Drag');
    expect(html).toContain('Browse');
  });

  test('renders uploading, done and error attachment states', () => {
    const html = renderToStaticMarkup(
      <SharedFileUploader
        uploadType="digitalProductFiles"
        onUploaded={() => {}}
        initialItems={[
          {
            id: 'u1',
            name: 'uploading.pdf',
            size: 1000,
            progress: 42,
            status: 'uploading',
          },
          {id: 'd1', name: 'done.pdf', size: 2000, progress: 100, status: 'done'},
          {
            id: 'e1',
            name: 'bad.exe',
            size: 3000,
            progress: 0,
            status: 'error',
            error: 'Unsupported file type',
          },
        ]}
      />,
    );
    expect(html).toContain('uploading.pdf');
    expect(html).toContain('42%');
    expect(html).toContain('done.pdf');
    expect(html).toContain('bad.exe');
    expect(html).toContain('Unsupported file type');
    expect(html).toContain('Remove uploading.pdf');
  });
});

describe('SharedFileUploader bare mode', () => {
  test('renders without a Card wrapper for embedding in existing Cards', () => {
    const html = renderToStaticMarkup(
      <SharedFileUploader
        uploadType="courseResources"
        onUploaded={() => {}}
        bare
      />,
    );
    expect(html).not.toContain('data-slot="card"');
    expect(html).toContain('Drag');
    expect(html).toContain('Browse');
  });

  test('uses core dropzone tokens, not the heavy block style', () => {
    const html = renderToStaticMarkup(
      <SharedFileUploader
        uploadType="courseResources"
        onUploaded={() => {}}
        bare
      />,
    );
    expect(html).toContain('rounded-card');
    expect(html).not.toContain('border-2');
    expect(html).not.toContain('py-12');
  });
});

describe('upload item state transitions', () => {
  const seed: UploadItem[] = [
    {id: 'u1', name: 'a.pdf', size: 1000, progress: 10, status: 'uploading'},
    {id: 'u2', name: 'b.pdf', size: 2000, progress: 20, status: 'uploading'},
  ];

  test('clearUploadItem removes the finished item so files show once', () => {
    const next = clearUploadItem(seed, 'u1');
    expect(next.map(i => i.id)).toEqual(['u2']);
  });

  test('applyUploadProgress updates only the matching item', () => {
    const next = applyUploadProgress(seed, 'u2', 55.6);
    expect(next.find(i => i.id === 'u2')?.progress).toBe(56);
    expect(next.find(i => i.id === 'u1')?.progress).toBe(10);
  });

  test('applyUploadError marks the item without touching others', () => {
    const next = applyUploadError(seed, 'u1', 'Upload failed');
    expect(next.find(i => i.id === 'u1')).toMatchObject({
      status: 'error',
      error: 'Upload failed',
    });
    expect(next.find(i => i.id === 'u2')?.status).toBe('uploading');
  });
});

describe('Attachment primitive', () => {
  test('exposes uploading/done/error states', () => {
    const html = renderToStaticMarkup(
      <Attachment state="error">oops</Attachment>,
    );
    expect(html).toContain('data-state="error"');
  });
});
