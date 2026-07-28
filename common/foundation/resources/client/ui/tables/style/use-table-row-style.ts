import {TableContext} from '@common/ui/tables/table-context';
import {useIsDarkMode} from '@ui/themes/use-is-dark-mode';
import {useIsMobileMediaQuery} from '@ui/utils/hooks/is-mobile-media-query';
import clsx from 'clsx';
import {useContext} from 'react';

interface Props {
  index: number;
  isSelected: boolean;
  isHeader?: boolean;
}
export function useTableRowStyle({index, isSelected, isHeader}: Props) {
  const isDarkMode = useIsDarkMode();
  const isMobile = useIsMobileMediaQuery();
  const {
    hideBorder,
    hideHeaderBorder: propsHideHeaderBorder,
    enableSelection,
    collapseOnMobile,
    onAction,
    isCollapsedMode,
    tableStyle,
  } = useContext(TableContext);
  const isFirst = index === 0;

  const hideHeaderBorder =
    propsHideHeaderBorder == null ? hideBorder : propsHideHeaderBorder;

  return clsx(
    tableStyle === 'flex' && 'flex gap-x-4',
    'break-inside-avoid outline-hidden border border-transparent',
    isCollapsedMode && 'rounded-card',
    onAction && 'cursor-pointer',
    isMobile && collapseOnMobile && hideBorder
      ? 'mb-2 pl-2 pr-0 rounded-sm'
      : 'px-4',
    !hideBorder && 'border-b-border',
    !hideHeaderBorder && isFirst && 'border-t-border',
    isSelected && 'bg-accent',
    !isSelected &&
      !isHeader &&
      (enableSelection || onAction) &&
      'focus-visible:bg-accent hover:bg-accent',
  );
}
