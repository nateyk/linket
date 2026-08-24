import {WidgetList} from '@app/dashboard/stores/store-editor/content/widgets/widget-list';
import {BiolinkWidget} from '@app/gen/schemas/biolink-widget';
import {useControlledState} from '@react-stately/utils';
import {Dialog} from '@shadcn/dialog/dialog';
import {Trans} from '@ui/i18n/trans';
import {ReactElement} from 'react';

type WidgetType = BiolinkWidget['type'];

interface SelectWidgetDialogProps {
  children?: ReactElement<typeof Dialog.Trigger>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSelect: (widgetType: WidgetType) => void;
}

export function SelectWidgetDialog({
  children,
  open: propsOpen,
  onOpenChange: propsOnOpenChange,
  onSelect,
}: SelectWidgetDialogProps) {
  const [open, setOpen] = useControlledState(
    propsOpen,
    false,
    propsOnOpenChange,
  );
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {children}
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Content className="sm:max-w-3xl">
          <Dialog.Header>
            <Dialog.Title>
              <Trans message="Add widget" />
            </Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(WidgetList).map(([widgetType, widget]) => (
                <button
                  key={widgetType}
                  type="button"
                  className="cursor-pointer rounded-card border p-3.5 text-left hover:bg-accent dark:bg-card"
                  onClick={() => {
                    setOpen(false);
                    onSelect(widgetType as WidgetType);
                  }}
                >
                  <img
                    src={widget.image}
                    alt=""
                    className="mr-auto mb-5 block h-13.5 w-13.5"
                  />
                  <div className="overflow-hidden text-lg font-semibold text-ellipsis whitespace-nowrap text-primary">
                    {widget.name}
                  </div>
                  <div className="text-muted-foreground">
                    {widget.description}
                  </div>
                </button>
              ))}
            </div>
          </Dialog.Body>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
