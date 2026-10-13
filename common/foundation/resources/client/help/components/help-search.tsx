import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@shadcn/forms/input-group/input-group';
import {Trans} from '@ui/i18n/trans';
import {cn} from '@ui/utils/cn';
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
      <InputGroup
        className={cn('bg-background', isLarge && 'h-12 [--radius:9999px]')}
      >
        <InputGroupInput
          name="search"
          defaultValue={defaultValue}
          autoFocus={autoFocus}
          placeholder={placeholder ?? 'Ask us a question...'}
        />
        <InputGroupAddon>
          <SearchIcon className="text-muted-foreground" />
        </InputGroupAddon>
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            type="submit"
            variant="default"
            size={isLarge ? 'sm' : undefined}
            className={cn(isLarge && 'rounded-full')}
          >
            <Trans message="Search" />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
}
