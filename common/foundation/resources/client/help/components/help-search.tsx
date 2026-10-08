import {Button} from '@shadcn/button/button';
import {Input} from '@shadcn/forms/input/input';
import {Trans} from '@ui/i18n/trans';
import {SearchIcon} from 'lucide-react';

interface Props {
  autoFocus?: boolean;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
}

export function HelpSearch({autoFocus, defaultValue, placeholder, className}: Props) {
  return (
    <form action="/help" method="GET" className={className}>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="search"
          defaultValue={defaultValue}
          autoFocus={autoFocus}
          placeholder={placeholder ?? 'Ask us a question...'}
          className="h-12 rounded-full bg-background pl-11 pr-24 text-base shadow-sm"
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
