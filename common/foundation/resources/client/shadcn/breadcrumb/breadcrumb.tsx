import {useRender} from '@base-ui/react/use-render';
import * as React from 'react';

import {Button} from '@shadcn/button/button';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {cn} from '@ui/utils/cn';
import {observeSize} from '@ui/utils/dom/observe-size';
import {ChevronRightIcon, MoreHorizontalIcon} from 'lucide-react';
import {
  Children,
  ComponentProps,
  Dispatch,
  ReactElement,
  RefObject,
  useCallback,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {Link} from 'react-router';

const MIN_VISIBLE_ITEMS = 1;
const MAX_VISIBLE_ITEMS = 10;

/**
 * Displays the path to the current resource using a hierarchy of links.
 */
function BreadcrumbRoot({
  className,
  children,
  ...props
}: React.ComponentProps<'nav'>) {
  // Not using React.Children.toArray because it mutates the key prop.
  const childArray: ReactElement<any>[] = [];
  Children.forEach(children, (child, index) => {
    if (React.isValidElement(child)) {
      if (child.key == null) {
        child = React.cloneElement(child, {key: index});
      }
      childArray.push(child);
    }
  });

  const domRef = useRef(null);
  const listRef = useRef<HTMLOListElement | null>(null);

  let [visibleItems, setVisibleItems] = useValueEffect(childArray.length);

  const updateOverflow = useEffectEvent(() => {
    const computeVisibleItems = (visibleItems: number): number => {
      // Refs can be null at runtime.
      const currListRef: HTMLOListElement | null = listRef.current;
      if (!currListRef) {
        return visibleItems;
      }

      let listItems = Array.from(currListRef.children) as HTMLLIElement[];
      if (listItems.length <= 0) {
        return visibleItems;
      }
      let containerWidth = currListRef.offsetWidth;
      let isShowingMenu = childArray.length > visibleItems;
      let calculatedWidth = 0;
      let newVisibleItems = 0;
      let maxVisibleItems = MAX_VISIBLE_ITEMS;

      // root item is always visible
      calculatedWidth += (listItems.shift() as HTMLLIElement).offsetWidth;
      newVisibleItems++;

      if (isShowingMenu) {
        calculatedWidth += (listItems.shift() as HTMLLIElement).offsetWidth;
        maxVisibleItems--;
      }

      if (calculatedWidth >= containerWidth) {
        newVisibleItems--;
      }

      if (listItems.length > 0) {
        // Ensure the last breadcrumb isn't truncated when we measure it.
        let last = listItems.pop() as HTMLLIElement;
        last.style.overflow = 'visible';

        calculatedWidth += last.offsetWidth;
        if (calculatedWidth < containerWidth) {
          newVisibleItems++;
        }

        last.style.overflow = '';
      }

      for (let breadcrumb of listItems.reverse()) {
        calculatedWidth += breadcrumb.offsetWidth;
        if (calculatedWidth < containerWidth) {
          newVisibleItems++;
        }
      }

      return Math.max(
        MIN_VISIBLE_ITEMS,
        Math.min(maxVisibleItems, newVisibleItems),
      );
    };

    setVisibleItems(function* () {
      // Update to show all items.
      yield childArray.length;

      // Measure, and update to show the items that fit.
      let newVisibleItems = computeVisibleItems(childArray.length);
      yield newVisibleItems;

      // If the number of items is less than the number of children,
      // then update again to ensure that the menu fits.
      if (newVisibleItems < childArray.length && newVisibleItems > 1) {
        yield computeVisibleItems(newVisibleItems);
      }
    });
  });

  useEffect(() => observeSize(domRef, updateOverflow), []);

  let lastChildren = useRef<typeof children | null>(null);
  useLayoutEffect(() => {
    if (children !== lastChildren.current) {
      lastChildren.current = children;
      updateOverflow();
    }
  });

  let contents = childArray;
  if (childArray.length > visibleItems) {
    // only render links and buttons inside dropdown
    const dropdownBreadcrumbs: ReactElement<any>[] = [];
    childArray.forEach(child => {
      const content = child.props.children;
      if (
        content &&
        (content.type === BreadcrumbLink || content.type === BreadcrumbButton)
      ) {
        dropdownBreadcrumbs.push(content);
      }
    });
    let menuItem = (
      <div key="menu">
        <Dropdown.Root>
          <Dropdown.Trigger
            render={<Button variant="ghost" size="icon" color="default" />}
          >
            <MoreHorizontalIcon />
          </Dropdown.Trigger>
          <Dropdown.Content>
            {dropdownBreadcrumbs.map((child, index) => {
              if (child.type === BreadcrumbLink) {
                return (
                  <Dropdown.LinkItem
                    key={index}
                    render={<Link to={child.props.to} />}
                  >
                    {child.props.children}
                  </Dropdown.LinkItem>
                );
              }

              return (
                <Dropdown.Item key={index} onClick={child.props.onClick}>
                  {child.props.children}
                </Dropdown.Item>
              );
            })}
          </Dropdown.Content>
        </Dropdown.Root>
      </div>
    );

    contents = [menuItem];
    let breadcrumbs = [...childArray];
    let endItems = visibleItems;
    if (visibleItems > 1) {
      let rootItem = breadcrumbs.shift();
      if (rootItem) {
        contents.unshift(rootItem);
      }
      endItems--;
    }
    contents.push(...breadcrumbs.slice(-endItems));
  }

  return (
    <nav
      aria-label="breadcrumb"
      data-slot="breadcrumb"
      className={cn(
        'w-full min-w-0 truncate text-sm text-muted-foreground',
        className,
      )}
      ref={domRef}
      {...props}
    >
      <ol
        ref={listRef}
        data-slot="breadcrumb-list"
        className={cn(
          'flex min-w-0 flex-nowrap items-center justify-start gap-2 truncate',
          className,
        )}
      >
        {contents}
      </ol>
    </nav>
  );
}

function BreadcrumbItem({className, ...props}: React.ComponentProps<'li'>) {
  return (
    <li
      data-slot="breadcrumb-item"
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap',
        className,
      )}
      {...props}
    />
  );
}

function BreadcrumbLink({
  className,
  render,
  ...props
}: useRender.ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      className={cn(
        'cursor-pointer transition-colors hover:text-foreground',
        className,
      )}
    />
  );
}

function BreadcrumbButton(props: ComponentProps<typeof Button>) {
  return <Button {...props} />;
}

function BreadcrumbPage({className, ...props}: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="breadcrumb-page"
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cn('text-foreground', className)}
      {...props}
    />
  );
}

function BreadcrumbSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<'li'>) {
  return (
    <li
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      className={cn('shrink-0 [&>svg]:size-font', className)}
      {...props}
    >
      {children ?? <ChevronRightIcon className="rtl:rotate-180" />}
    </li>
  );
}

// This hook works like `useState`, but when setting the value, you pass a generator function
// that can yield multiple values. Each yielded value updates the state and waits for the next
// layout effect, then continues the generator. This allows sequential updates to state to be
// written linearly.
type SetValueAction<S> = (prev: S) => Generator<any, void, unknown>;
function useValueEffect<S>(
  defaultValue: S | (() => S),
): [S, Dispatch<SetValueAction<S>>] {
  let [value, setValue] = useState(defaultValue);
  // Keep an up to date copy of value in a ref so we can access the current value in the generator.
  // This allows us to maintain a stable queue function.
  let currValue = useRef(value);
  let effect: RefObject<Generator<S> | null> = useRef<Generator<S> | null>(
    null,
  );

  // Store the function in a ref so we can always access the current version
  // which has the proper `value` in scope.
  let nextRef = useRef(() => {
    if (!effect.current) {
      return;
    }
    // Run the generator to the next yield.
    let newValue = effect.current.next();

    // If the generator is done, reset the effect.
    if (newValue.done) {
      effect.current = null;
      return;
    }

    // If the value is the same as the current value,
    // then continue to the next yield. Otherwise,
    // set the value in state and wait for the next layout effect.
    if (currValue.current === newValue.value) {
      nextRef.current();
    } else {
      setValue(newValue.value);
    }
  });

  useLayoutEffect(() => {
    currValue.current = value;
    // If there is an effect currently running, continue to the next yield.
    if (effect.current) {
      nextRef.current();
    }
  });

  let queue = useCallback(
    (fn: SetValueAction<S>) => {
      effect.current = fn(currValue.current);
      nextRef.current();
    },
    [nextRef],
  );

  return [value, queue];
}

export const Breadcrumb = Object.assign(BreadcrumbRoot, {
  Root: BreadcrumbRoot,
  Button: BreadcrumbButton,
  Item: BreadcrumbItem,
  Link: BreadcrumbLink,
  Page: BreadcrumbPage,
  Separator: BreadcrumbSeparator,
});
