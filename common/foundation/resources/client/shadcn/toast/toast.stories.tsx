import {Button} from '@shadcn/button/button';
import {Toast, Toaster, toast} from '@shadcn/toast/toast';
import preview from '@storybook/preview';
import {Trans} from '@ui/i18n/trans';

const meta = preview.meta({
  title: 'Toast',
  component: Toast,
  subcomponents: {
    Toaster,
  },
  tags: ['autodocs'],
});

function showPositionedToast(position: any) {
  toast(<Trans message={`Toast at ${position}`} />, {timeout: 10, position});
}

export const Basic = meta.story({
  decorators: [
    Story => {
      const alreadyHasToastPortal = document.querySelector(
        '[data-slot="toast-portal"]',
      );
      return (
        <div className="flex min-h-40 items-center justify-center">
          <Story />
          {!alreadyHasToastPortal && <Toaster />}
        </div>
      );
    },
  ],
  render: () => (
    <Button
      onClick={() => {
        toast('Post has been created');
      }}
    >
      <Trans message="Create post" />
    </Button>
  ),
});

/**
 * Open toast with different types to change style and indicate the status of the operation.
 */
export const ToastTypes = meta.story({
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        color="default"
        onClick={() =>
          toast.success(<Trans message="Success toast" />, {timeout: 0})
        }
      >
        <Trans message="Success" />
      </Button>
      <Button
        variant="outline"
        color="default"
        onClick={() => toast.info(<Trans message="Info toast" />, {timeout: 0})}
      >
        <Trans message="Info" />
      </Button>
      <Button
        variant="outline"
        color="default"
        onClick={() =>
          toast.warning(<Trans message="Warning toast" />, {timeout: 0})
        }
      >
        <Trans message="Warning" />
      </Button>
      <Button
        variant="outline"
        color="default"
        onClick={() =>
          toast.error(<Trans message="Error toast" />, {timeout: 0})
        }
      >
        <Trans message="Error" />
      </Button>
    </div>
  ),
});

/**
 * Show toast until a promise is resolved, if toast needs to be persistent.
 */
export const withPromise = meta.story({
  render: () => (
    <Button
      onClick={() =>
        toast.promise(
          new Promise(resolve => setTimeout(() => resolve(true), 1500)),
          {
            loading: {
              title: <Trans message="Loading toast..." />,
              timeout: 0,
            },
            success: {
              title: <Trans message="Promise resolved" />,
              timeout: 0,
            },
            error: {title: <Trans message="Promise failed" />, timeout: 0},
          },
        )
      }
    >
      <Trans message="Show toast" />
    </Button>
  ),
});

/**
 * Provide an action to the toast. It will be rendered as a button in the toast.
 */
export const WithAction = meta.story({
  render: () => (
    <Button
      variant="outline"
      color="default"
      onClick={() =>
        toast(<Trans message="Post archived" />, {
          timeout: 0,
          description: <Trans message="You can undo this action." />,
          actionProps: {
            children: <Trans message="Undo" />,
            onClick: () => toast.success(<Trans message="Post restored" />),
          },
        })
      }
    >
      <Trans message="Action" />
    </Button>
  ),
});

/**
 * Show toast with a description when additional details need to be shown.
 */
export const WithDescription = meta.story({
  render: () => (
    <Button
      onClick={() => {
        toast.success('Event has been created', {
          description: 'Monday, January 3rd at 6:00 PM',
        });
      }}
    >
      <Trans message="Show toast" />
    </Button>
  ),
});

/**
 * Show toast at different positions when default `bottom-center` position would cover up important content.
 */
export const DifferentPositions = meta.story({
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        color="default"
        onClick={() => showPositionedToast('top-left')}
      >
        <Trans message="Top left" />
      </Button>
      <Button
        variant="outline"
        color="default"
        onClick={() => showPositionedToast('top-center')}
      >
        <Trans message="Top center" />
      </Button>
      <Button
        variant="outline"
        color="default"
        onClick={() => showPositionedToast('top-right')}
      >
        <Trans message="Top right" />
      </Button>
      <Button
        variant="outline"
        color="default"
        onClick={() => showPositionedToast('bottom-left')}
      >
        <Trans message="Bottom left" />
      </Button>
      <Button
        variant="outline"
        color="default"
        onClick={() => showPositionedToast('bottom-center')}
      >
        <Trans message="Bottom center" />
      </Button>
      <Button
        variant="outline"
        color="default"
        onClick={() => showPositionedToast('bottom-right')}
      >
        <Trans message="Bottom right" />
      </Button>
    </div>
  ),
});
