import {Trans} from '@ui/i18n/trans';
import {Outlet} from 'react-router';

export function Component() {
  return (
    <div>
      <h1 className="my-8 text-3xl font-bold">
        <Trans message="Change payment method" />
      </h1>
      <Outlet />
    </div>
  );
}
