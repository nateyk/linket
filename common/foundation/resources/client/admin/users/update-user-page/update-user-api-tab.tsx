import {User} from '@app/gen/schemas/user';
import {AccessTokenPanel} from '@common/auth/ui/account-settings/access-token-panel/access-token-panel';
import {useOutletContext} from 'react-router';

export function Component() {
  const user = useOutletContext() as User;
  return <AccessTokenPanel user={user} />;
}
