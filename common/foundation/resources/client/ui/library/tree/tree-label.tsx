import {ArrowRightIcon} from '@ui/icons/material/ArrowRight';
import clsx from 'clsx';
import {forwardRef, MouseEventHandler, ReactNode, useContext} from 'react';
import {TreeContext} from './tree-context';

interface TreeLabelProps {
  level?: number;
  node: any;
  icon?: ReactNode;
  label?: ReactNode;
  className?: string;
}
export const TreeLabel = forwardRef<HTMLDivElement, TreeLabelProps>(
  ({icon, label, level = 0, node, className, ...domProps}, ref) => {
    const {expandedKeys, setExpandedKeys, selectedKeys, setSelectedKeys} =
      useContext(TreeContext);
    const isExpanded = expandedKeys.includes(node.id);
    const isSelected = selectedKeys.includes(node.id);

    const handleExpandIconClick: MouseEventHandler = e => {
      e.stopPropagation();
      const index = expandedKeys.indexOf(node.id);
      const newExpandedKeys = [...expandedKeys];
      if (index > -1) {
        newExpandedKeys.splice(index, 1);
      } else {
        newExpandedKeys.push(node.id);
      }
      setExpandedKeys(newExpandedKeys);
    };

    return (
      <div
        {...domProps}
        ref={ref}
        onClick={e => {
          e.stopPropagation();
          setSelectedKeys([node.id]);
        }}
        className={clsx(
          'header tree-label flex cursor-pointer flex-nowrap items-center gap-1 overflow-hidden rounded-button py-1.5 text-ellipsis whitespace-nowrap',
          className,
          isSelected && 'bg-sidebar-accent text-sidebar-accent-foreground',
          !isSelected &&
            'hover:bg-sidebar-accent [&_svg]:text-muted-foreground',
        )}
      >
        {level > 0 && (
          <div className="flex">
            {Array.from({length: level}).map((_, i) => {
              return <div key={i} className="h-6 w-6" />;
            })}
          </div>
        )}
        <div onClick={handleExpandIconClick}>
          <ArrowRightIcon
            size="sm"
            className={clsx(
              'cursor-default transition-transform',
              isExpanded && 'rotate-90',
            )}
          />
        </div>
        {icon}
        <div className="overflow-hidden pr-1.5 text-ellipsis">{label}</div>
      </div>
    );
  },
);
TreeLabel.displayName = 'TreeLabel';
