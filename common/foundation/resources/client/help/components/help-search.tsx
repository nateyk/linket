import {Button} from '@shadcn/button/button';
import {Input} from '@shadcn/forms/input/input';
import {cn} from '@ui/utils/cn';
import {Trans} from '@ui/i18n/trans';
import {SearchIcon} from 'lucide-react';

interface Props {
  autoFocus?: boolean;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
  size?: 'sm' | 'lg';
}

export function HelpSearch({
  autoFocus,
  defaultValue,
  placeholder,
  className,
  size = 'sm',
}: Props) {
  const isLarge = size === 'lg';

  return (
    <form action="/help" method="GET" className={className}>
      <div className="relative">
        <SearchIcon
          className={cn(
            'pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground',
            isLarge ? 'size-5' : 'size-4',
          )}
        />
        <Input
          name="search"
          defaultValue={defaultValue}
          autoFocus={autoFocus}
          placeholder={placeholder ?? 'Ask us a question...'}
          className={cn(
            'rounded-full bg-background pl-11 pr-24 shadow-sm',
            isLarge ? 'h-14 text-base' : 'h-12 text-base',
          )}
        />
        <Button
          type="submit"
          size="sm"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full"
        >
          <Trans message="Search" />
        </Button>
      </div>
    </form>
  );
}
