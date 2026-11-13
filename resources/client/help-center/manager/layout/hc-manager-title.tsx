import {useHcManagerBasePath} from '@app/help-center/manager/hc-manager-paths';
import {Trans} from '@ui/i18n/trans';
import {ExternalLinkIcon} from 'lucide-react';
import {ReactNode} from 'react';
import {Link} from 'react-router';

interface Props {
  children: ReactNode;
}
export function HcManagerTitle({children}: Props) {
  const root = useHcManagerBasePath();
  return (
    <div className="mb-2.5 flex items-center justify-between gap-3">
      <h2 className="text-sm font-semibold text-muted-foreground">
        {children}
      </h2>
      <Link
        to={`${root}/articles`}
        className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
      >
        <ExternalLinkIcon className="size-3.5" />
        <Trans message="View all articles" />
      </Link>
    </div>
  );
}
