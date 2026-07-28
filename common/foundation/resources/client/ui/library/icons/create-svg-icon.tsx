import {SvgIcon, SvgIconProps} from '@ui/icons/svg-icon';
import clsx from 'clsx';
import React, {ComponentType, ReactElement, RefObject} from 'react';

export function createSvgIcon(
  path: ReactElement | ReactElement[],
  displayName: string = '',
  viewBox?: string,
  type: 'lucide' | 'material' = 'material',
): ComponentType<SvgIconProps> {
  let Component: any = null;

  if (type === 'material') {
    Component = (props: SvgIconProps, ref: RefObject<SVGSVGElement>) => (
      <SvgIcon ref={ref} viewBox={viewBox} {...props} size={props.size || 'xs'}>
        {path}
      </SvgIcon>
    );
  } else {
    Component = (props: SvgIconProps, ref: RefObject<SVGSVGElement>) => (
      <SvgIcon
        ref={ref}
        viewBox={viewBox}
        fill="fill-none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={clsx(props.className, 'lucide')}
        {...props}
        size={props.size}
      >
        {path}
      </SvgIcon>
    );
  }

  return React.memo(React.forwardRef(Component as any));
}

export interface IconTree {
  tag: string;
  attr?: {[key: string]: string};
  // Can't use "IconTree", otherwise there's circular reference error in hook form
  child?: {tag: string; attr?: {[key: string]: string}}[];
}
export function createSvgIconFromTree(
  data: IconTree[],
  displayName: string = '',
  type: 'lucide' | 'material' = 'material',
) {
  const path = treeToElement(data);
  return path ? createSvgIcon(path, displayName, undefined, type) : null;
}

function treeToElement(
  tree?: IconTree[],
): React.ReactElement<{}>[] | undefined {
  return (
    tree?.map &&
    tree.map((node, i) => {
      return React.createElement(
        node.tag,
        {key: i, ...node.attr},
        treeToElement(node.child),
      );
    })
  );
}

export function elementToTree(el: HTMLElement | SVGElement): IconTree {
  const attributes: IconTree['attr'] = {};
  const tree: IconTree = {tag: el.tagName, attr: attributes};
  Array.from(el.attributes).forEach(attribute => {
    attributes[attribute.name] = attribute.value;
  });
  if (el.children.length) {
    tree.child = Array.from(el.children).map(child =>
      elementToTree(child as HTMLElement),
    );
  }
  return tree;
}
