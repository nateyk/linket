import {CrupdateLinkOverlayBody} from '@app/gen/schemas/crupdate-link-overlay-body';
import {LinkOverlay} from '@app/gen/schemas/link-overlay';
import {Button} from '@ui/buttons/button';
import clsx from 'clsx';

type Overlay = LinkOverlay | CrupdateLinkOverlayBody;

export function FloatingLinkOverlay({overlay}: {overlay: Overlay}) {
  const colors = overlay.colors || {};
  return (
    <div
      style={{
        backgroundColor: colors['bg-color'],
        backgroundImage: colors['bg-image'] ? `url(${colors['bg-image']})` : '',
        color: colors['text-color'],
      }}
      className={clsx(
        'text-default absolute max-w-[calc(100%-14px)] overflow-hidden bg-background bg-cover p-4 shadow-lg',
        getOverlayPositionClass(overlay),
        getOverlayThemeClass(overlay.theme),
      )}
    >
      {overlay.label && (
        <div
          className={clsx(
            'absolute h-22 w-21',
            overlay.theme === 'pill' ? 'top-1 right-1' : '-top-1 -right-1',
          )}
        >
          <div
            className="relative top-3.5 -left-1 w-30 rotate-45 py-1 text-center text-sm shadow-sm"
            style={{
              background: colors['label-bg-color'],
              color: colors['label-color'],
            }}
          >
            {overlay.label}
          </div>
        </div>
      )}
      {overlay.message && (
        <div
          className={clsx(
            'text-sm',
            overlay.theme === 'full-width' ? 'mb-3.5' : 'my-3.5',
          )}
        >
          {overlay.message}
        </div>
      )}
      {overlay.btn_text && (
        <Button
          size="sm"
          style={{
            borderColor: colors['btn-bg-color'],
            background: colors['btn-bg-color'],
            color: colors['btn-text-color'],
          }}
          variant="flat"
          color="primary"
          elementType="a"
          href={overlay.btn_link ?? ''}
          tabIndex={0}
        >
          {overlay.btn_text}
        </Button>
      )}
    </div>
  );
}

function getOverlayPositionClass(overlay: Overlay) {
  // full width overlay can only be top or bottom
  if (overlay.theme === 'full-width') {
    return overlay.position?.startsWith('top')
      ? 'top-3.5 left-3.5'
      : 'bottom-3.5 left-3.5';
  }

  switch (overlay.position) {
    case 'top-left':
      return 'top-3.5 left-3.5';
    case 'top-right':
      return 'top-3.5 right-3.5';
    case 'bottom-left':
      return 'bottom-3.5 left-3.5';
    case 'bottom-right':
      return 'bottom-3.5 right-3.5';
  }
}

function getOverlayThemeClass(theme: LinkOverlay['theme'] = 'default') {
  const defaultWidth = 'w-87.5';
  switch (theme) {
    case 'default':
      return `rounded-sm p-4 ${defaultWidth}`;
    case 'rounded':
      return `rounded-lg p-4 ${defaultWidth}`;
    case 'pill':
      return `rounded-full px-7.5 pb-6 pt-3.5 ${defaultWidth}`;
    case 'full-width':
      return 'rounded-sm w-full flex items-center justify-center flex-col';
  }
}
