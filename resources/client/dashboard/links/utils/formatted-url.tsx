import {removeProtocol} from '@ui/utils/urls/remove-protocol';
import {memo} from 'react';

type Props = {
  url: string;
};
export const FormattedUrl = memo(({url}: Props) => {
  return removeProtocol(url);
});
