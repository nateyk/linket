import {Combobox as ComboboxPrimitive} from '@base-ui/react';
import {dropdownBaseStyles} from '@shadcn/dropdown/dropdown-base-styles';
import {Combobox} from '@shadcn/forms/combobox/combobox';
import {
  ScrollArea,
  ScrollAreaScrollBar,
  ScrollAreaViewport,
} from '@shadcn/scroll-area/scroll-area';
import {
  Virtualizer as TanstackVirtualizer,
  useVirtualizer,
} from '@tanstack/react-virtual';
import {cn} from '@ui/utils/cn';
import {
  cloneElement,
  ComponentProps,
  ReactElement,
  RefObject,
  useCallback,
  useImperativeHandle,
  useRef,
} from 'react';

type ComboboxVirtualizer = TanstackVirtualizer<HTMLDivElement, Element>;

function VirtualizedComboboxRoot<
  Value,
  Multiple extends boolean | undefined = false,
>({
  virtualizerRef,
  onItemHighlighted,
  ...props
}: ComboboxPrimitive.Root.Props<Value, Multiple> & {
  virtualizerRef: RefObject<ComboboxVirtualizer | null>;
}) {
  return (
    <Combobox.Root
      virtualized
      onItemHighlighted={(item, details) => {
        onItemHighlighted?.(item, details);

        const virtualizer = virtualizerRef.current;
        if (!item || !virtualizer) {
          return;
        }

        const isStart = details.index === 0;
        const isEnd = details.index === virtualizer.options.count - 1;
        const shouldScroll =
          details.reason === 'none' ||
          (details.reason === 'keyboard' && (isStart || isEnd));

        if (shouldScroll) {
          queueMicrotask(() => {
            virtualizer.scrollToIndex(details.index, {
              align: isEnd ? 'start' : 'end',
            });
          });
        }
      }}
      {...props}
    />
  );
}

type VirtualizedComboboxListProps = Omit<
  ComponentProps<typeof ComboboxPrimitive.List>,
  'children'
> & {
  enabled: boolean;
  virtualizerRef: RefObject<ComboboxVirtualizer | null>;
  children: (
    item: any,
    index: number,
  ) => ReactElement<
    ComboboxPrimitive.Item.Props & {'data-index': string | number}
  >;
};
function VirtualizedComboboxList({
  enabled,
  virtualizerRef,
  children,
  className,
  ...listProps
}: VirtualizedComboboxListProps) {
  const filteredItems = Combobox.useFilteredItems<unknown>();

  const scrollElementRef = useRef<HTMLDivElement | null>(null);

  const virtualizer = useVirtualizer({
    enabled,
    count: filteredItems.length,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () => 36,
    overscan: 20,
  });

  useImperativeHandle(virtualizerRef, () => virtualizer);

  const handleScrollElementRef = useCallback(
    (element: HTMLDivElement | null) => {
      scrollElementRef.current = element;
      if (element) {
        virtualizer.measure();
      }
    },
    [virtualizer],
  );

  const totalSize = virtualizer.getTotalSize();

  if (!filteredItems.length) {
    return null;
  }

  return (
    <ScrollArea className={dropdownBaseStyles.scrollArea}>
      <ComboboxPrimitive.List
        render={<ScrollAreaViewport />}
        ref={handleScrollElementRef}
        data-slot="dropdown-list"
        className={cn(dropdownBaseStyles.list, className)}
        {...listProps}
      >
        <div role="presentation">
          <div
            role="presentation"
            className="relative w-full"
            style={{height: totalSize}}
          >
            {virtualizer.getVirtualItems().map(virtualItem => {
              const item = filteredItems[virtualItem.index];
              if (!item) {
                return null;
              }

              return cloneElement(children(item, virtualItem.index), {
                key: virtualItem.key,
                index: virtualItem.index,
                'data-index': virtualItem.index,
                ref: virtualizer.measureElement,
                'aria-setsize': filteredItems.length,
                'aria-posinset': virtualItem.index + 1,
                style: {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: virtualItem.size,
                  transform: `translateY(${virtualItem.start}px)`,
                },
              });
            })}
          </div>
        </div>
        <ScrollAreaScrollBar
          className={dropdownBaseStyles.customScrollbar}
          onlyShowOnHover
          showTrack
        />
      </ComboboxPrimitive.List>
    </ScrollArea>
  );
}

const VirtualizedCombobox = {
  Root: VirtualizedComboboxRoot,
  List: VirtualizedComboboxList,
};

declare namespace VirtualizedCombobox {
  export type Virtualizer = ComboboxVirtualizer;
}

export {VirtualizedCombobox};
