import {IconButton} from '@ui/buttons/icon-button';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {DragIndicatorIcon} from '@ui/icons/material/DragIndicator';
import {MoreVertIcon} from '@ui/icons/material/MoreVert';
import {DragPreview} from '@ui/interactions/dnd/drag-preview';
import {useSortable} from '@ui/interactions/dnd/sortable/use-sortable';
import {
  DraggableId,
  DragPreviewRenderer,
} from '@ui/interactions/dnd/use-draggable';
import {Menu, MenuItem, MenuTrigger} from '@ui/menu/menu-trigger';
import {createEventHandler} from '@ui/utils/dom/create-event-handler';
import {useIsTouchDevice} from '@ui/utils/hooks/is-touch-device';
import React, {ReactNode, RefObject, useRef} from 'react';

interface Props<T extends DraggableId> {
  item: T;
  items: T[];
  onSortEnd: (oldIndex: number, newIndex: number) => void;
  children: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  onClick: () => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isReordering?: boolean;
}
export function HcManagerRow<T extends DraggableId>({
  item,
  items,
  onSortEnd,
  onClick,
  onView,
  onEdit,
  onDelete,
  isReordering = false,
  children,
  description,
  icon,
}: Props<T>) {
  const domRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<DragPreviewRenderer>(null);
  const isTouchDevice = useIsTouchDevice();
  const {trans} = useTrans();

  const {sortableProps, dragHandleRef} = useSortable({
    ref: domRef,
    disabled: !!isTouchDevice || isReordering,
    item,
    items,
    type: 'hcManagerSort',
    preview: previewRef,
    onSortEnd,
  });

  return (
    <div
      className="mb-3 flex min-w-0 cursor-pointer items-center gap-1.5 rounded-card border p-3 transition-colors hover:border-primary focus-within:border-primary/50"
      onClick={createEventHandler(() => onClick())}
      ref={domRef}
      {...sortableProps}
    >
      {!isTouchDevice && (
        <IconButton
          className="shrink-0 text-muted-foreground"
          aria-label={trans({message: 'Reorder'})}
          ref={dragHandleRef as unknown as RefObject<HTMLButtonElement>}
          disabled={isReordering}
          onClick={e => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <DragIndicatorIcon />
        </IconButton>
      )}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {icon}
        <div className="min-w-0 flex-auto">
          <h3 className="min-w-0 text-sm font-semibold">
            <button
              type="button"
              className="block min-w-0 max-w-full break-words rounded-input text-left hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              onClick={e => {
                e.stopPropagation();
                onClick();
              }}
            >
              {children}
            </button>
          </h3>
          {description && (
            <div className="text-sm text-muted-foreground">{description}</div>
          )}
        </div>
      </div>
      <MenuTrigger>
        <IconButton
          aria-label={trans({message: 'More actions'})}
          className="ml-auto shrink-0 text-muted-foreground"
          onClick={e => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <MoreVertIcon />
        </IconButton>
        <Menu>
          <MenuItem value="edit" onSelected={() => onEdit()}>
            <Trans message="Edit" />
          </MenuItem>
          <MenuItem
            value="sendToTop"
            onSelected={() => {
              const index = items.indexOf(item);
              if (index > 0) {
                onSortEnd(index, 0);
                document.documentElement.scrollTop = 0;
              }
            }}
          >
            <Trans message="Send to top" />
          </MenuItem>
          <MenuItem value="viewInHc" onSelected={() => onView()}>
            <Trans message="View in help center" />
          </MenuItem>
          <MenuItem value="delete" onSelected={() => onDelete()}>
            <Trans message="Delete" />
          </MenuItem>
        </Menu>
      </MenuTrigger>
      <RowDragPreview name={children} ref={previewRef} />
    </div>
  );
}

interface RowDragPreviewProps {
  name: ReactNode;
}
const RowDragPreview = React.forwardRef<
  DragPreviewRenderer,
  RowDragPreviewProps
>(({name}, ref) => {
  return (
    <DragPreview ref={ref}>
      {() => <div className="rounded bg-chip p-6 text-sm shadow">{name}</div>}
    </DragPreview>
  );
});
