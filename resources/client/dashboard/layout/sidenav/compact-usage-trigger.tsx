import {useUsage} from '@app/dashboard/use-usage';
import {UsageDialogContent} from '@app/dashboard/layout/sidenav/usage-dialog';
import {Button} from '@shadcn/button/button';
import {Popover} from '@shadcn/popover/popover';
import {InfoIcon} from 'lucide-react';

type Props = {
  className?: string;
};
export function CompactUsageTrigger({className}: Props) {
  const {data} = useUsage();

  if (!data) {
    return null;
  }

  return (
    <Popover.Root>
      <Popover.Trigger
        openOnHover
        delay={0}
        render={<Button size="icon-sm" variant="ghost" color="default" />}
        className={className}
      >
        <InfoIcon />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" side="right" className="w-xl">
          <UsageDialogContent />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
