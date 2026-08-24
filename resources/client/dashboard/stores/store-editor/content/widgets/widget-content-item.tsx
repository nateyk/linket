import {useBiolinkEditorStore} from '@app/dashboard/stores/store-editor/biolink-editor-store';
import {BiolinkItemLayout} from '@app/dashboard/stores/store-editor/content/biolink-item-layout';
import {useSortBiolinkContent} from '@app/dashboard/stores/store-editor/content/use-sort-biolink-content';
import {WidgetList} from '@app/dashboard/stores/store-editor/content/widgets/widget-list';
import {WidgetRenderers} from '@app/dashboard/stores/store-editor/content/widgets/widget-renderers';
import {
  deleteStoreWidgetOptions,
  updateStoreWidgetOptions,
} from '@app/dashboard/stores/stores-queries';
import {BiolinkWidget} from '@app/gen/schemas/biolink-widget';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {useRequiredParams} from '@common/ui/navigation/use-required-params';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Switch} from '@shadcn/forms/switch/switch';
import {useMutation} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {ArrowDownIcon, ArrowUpIcon, PencilIcon, XIcon} from 'lucide-react';
import {useState} from 'react';

interface WidgetContentItemProps {
  item: BiolinkWidget;
}
export function WidgetContentItem({item: widget}: WidgetContentItemProps) {
  const config = WidgetList[widget.type];
  const WidgetRenderer = WidgetRenderers[widget.type];
  const WidgetDialog = config.dialog;

  return (
    <BiolinkItemLayout.Root item={widget}>
      <div className="flex items-center">
        <BiolinkItemLayout.Title>{config.name}</BiolinkItemLayout.Title>
        <WidgetDialog widget={widget}>
          <Dialog.Trigger render={<Button variant="ghost" />}>
            <PencilIcon />
            <Trans message="Edit" />
          </Dialog.Trigger>
        </WidgetDialog>
        <DeleteDialog widget={widget} />
      </div>
      <div className="mb-5 flex items-center gap-1.5">
        <WidgetRenderer widget={widget} variant="editor" />
      </div>
      <ActionRow widget={widget} />
    </BiolinkItemLayout.Root>
  );
}

interface ActionRowProps {
  widget: BiolinkWidget;
}
function ActionRow({widget}: ActionRowProps) {
  const {storeId} = useRequiredParams(['storeId']);
  const sortContent = useSortBiolinkContent();
  const content = useBiolinkEditorStore(s => s.content);
  const overrideContent = useBiolinkEditorStore(s => s.overrideContent);

  const updateWidget = useMutation({
    ...updateStoreWidgetOptions(String(storeId), String(widget.id)),
    onSuccess: (response: any) => {
      overrideContent((response as any).data.content);
    },
    onError: err => showHttpErrorToast(err),
  });

  const handlePinToTop = () => {
    if (widget.pinned) {
      updateWidget.mutate({pinned: null});
    } else {
      const pinnedCount = content.filter(
        x => 'pinned' in x && x.pinned === 'top',
      ).length;
      const oldIndex = content.findIndex(
        x => x.model_type === widget.model_type && x.id === widget.id,
      );
      sortContent.mutate({
        oldIndex,
        // put widget after any other widgets that are already pinned to top
        newIndex: pinnedCount,
        widgetToPin: widget.id,
      });
    }
  };

  return (
    <div className="flex h-10.5 items-center justify-between gap-6 text-muted-foreground">
      <Switch
        checked={widget.active}
        disabled={updateWidget.isPending}
        onCheckedChange={() => {
          updateWidget.mutate({
            active: !widget.active,
          });
        }}
      />
      <Button
        variant="outline"
        size="xs"
        color={widget.pinned === 'top' ? 'primary' : undefined}
        disabled={sortContent.isPending}
        onClick={handlePinToTop || updateWidget.isPending}
      >
        {widget.pinned === 'top' ? <ArrowUpIcon /> : <ArrowDownIcon />}
        {widget.pinned === 'top' ? (
          <Trans message="Unpin from top" />
        ) : (
          <Trans message="Pin to top" />
        )}
      </Button>
    </div>
  );
}

function DeleteDialog({widget}: {widget: BiolinkWidget}) {
  const {storeId} = useRequiredParams(['storeId']);
  const overrideContent = useBiolinkEditorStore(s => s.overrideContent);

  const [open, setOpen] = useState(false);
  const deleteWidget = useMutation({
    ...deleteStoreWidgetOptions(String(storeId), String(widget.id)),
    onSuccess: (response: any) => {
      overrideContent((response as any).data.content);
    },
    onError: err => showHttpErrorToast(err),
  });
  return (
    <AlertDialog.Root open={open} onOpenChange={setOpen}>
      <AlertDialog.Trigger
        render={
          <Button
            size="icon-sm"
            variant="ghost"
            disabled={deleteWidget.isPending}
          />
        }
      >
        <XIcon />
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop />
        <AlertDialog.Content size="sm">
          <AlertDialog.Header>
            <AlertDialog.Title>
              <Trans message="Delete widget" />
            </AlertDialog.Title>
            <AlertDialog.Description>
              <Trans message="Are you sure you want to delete this widget?" />
            </AlertDialog.Description>
          </AlertDialog.Header>
          <AlertDialog.Footer>
            <AlertDialog.Cancel>
              <Trans message="Cancel" />
            </AlertDialog.Cancel>
            <AlertDialog.Action
              color="danger"
              disabled={deleteWidget.isPending}
              onClick={() => deleteWidget.mutate()}
            >
              <Trans message="Delete" />
            </AlertDialog.Action>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
