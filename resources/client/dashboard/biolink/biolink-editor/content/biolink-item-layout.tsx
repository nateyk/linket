import {useBiolinkEditorStore} from '@app/dashboard/biolink/biolink-editor/biolink-editor-store';
import {useSortBiolinkContent} from '@app/dashboard/biolink/biolink-editor/content/use-sort-biolink-content';
import {BiolinkLink} from '@app/gen/schemas/biolink-link';
import {BiolinkWidget} from '@app/gen/schemas/biolink-widget';
import {useSortable} from '@ui/interactions/dnd/sortable/use-sortable';
import {cn} from '@ui/utils/cn';
import clsx from 'clsx';
import {GripVerticalIcon} from 'lucide-react';
import {ReactNode, useRef} from 'react';

type RootProps = {
  item: BiolinkLink | BiolinkWidget;
  className?: string;
  children: ReactNode;
};

function Root({item, className, children}: RootProps) {
  const content = useBiolinkEditorStore(s => s.content);
  const sortContent = useSortBiolinkContent();
  const itemRef = useRef<HTMLDivElement>(null);
  const sortDisabled = !item || ('pinned' in item && item.pinned != null);

  const {sortableProps, dragHandleRef} = useSortable({
    item: item || 'noop',
    items: content || [],
    type: 'biolinkEditorSortable',
    ref: itemRef,
    onSortEnd: (oldIndex, newIndex) => {
      sortContent.mutate({oldIndex, newIndex});
    },
    disabled: sortDisabled,
  });

  return (
    <div
      className={cn(
        'flex h-43 items-stretch rounded-card border shadow-xs dark:bg-card',
        className,
      )}
      ref={itemRef}
      {...sortableProps}
    >
      <button
        type="button"
        className={clsx(
          'shrink-0 border-r px-2.5 text-muted-foreground',
          sortDisabled ? 'pointer-events-none opacity-50' : 'hover:cursor-move',
        )}
        disabled={sortDisabled}
        ref={dragHandleRef}
      >
        <GripVerticalIcon className="text-muted-foreground" />
      </button>
      <div className="min-w-0 flex-auto p-6">{children}</div>
    </div>
  );
}

function ItemTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'mr-auto flex-auto overflow-hidden font-medium text-ellipsis whitespace-nowrap',
        className,
      )}
    >
      {children}
    </div>
  );
}

export const BiolinkItemLayout = Object.assign(Root, {
  Root: Root,
  Title: ItemTitle,
});
