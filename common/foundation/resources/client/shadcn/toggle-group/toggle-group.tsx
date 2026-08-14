'use client';

import {ToggleGroup as ToggleGroupPrimitive} from '@base-ui/react/toggle-group';

import {ButtonGroup} from '@shadcn/button-group/button-group';
import {ComponentProps} from 'react';

/**
 * Provides a shared state to a series of toggle buttons.
 */
export function ToggleGroup({
  orientation = 'horizontal',
  ...props
}: Omit<
  ToggleGroupPrimitive.Props & ComponentProps<typeof ButtonGroup.Root>,
  'onChange'
>) {
  return (
    <ToggleGroupPrimitive
      orientation={orientation}
      render={<ButtonGroup.Root orientation={orientation} />}
      {...props}
    />
  );
}
