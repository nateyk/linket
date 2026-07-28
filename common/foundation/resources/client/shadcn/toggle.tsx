import {Toggle as TogglePrimitive} from '@base-ui/react/toggle';

import {Button} from '@shadcn/button/button';
import {ComponentProps} from 'react';

/**
 * A two-state button that can be on or off.
 */
export function Toggle(
  props: TogglePrimitive.Props & ComponentProps<typeof Button>,
) {
  return <TogglePrimitive render={<Button />} {...props} />;
}
