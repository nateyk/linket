import {cn} from '@ui/utils/cn';
import {CheckIcon} from 'lucide-react';

type Props = {
  onChange?: (e: string) => void;
  isActive?: boolean;
  className?: string;
  color: string;
};
export function ColorSwatch({onChange, isActive, className, color}: Props) {
  return (
    <button
      type="button"
      onClick={() => {
        onChange?.(color);
      }}
      className={cn(
        'relative flex aspect-square shrink-0 items-center justify-center rounded-full border text-white outline-offset-2 outline-foreground',
        isActive && 'outline-1',
        className,
      )}
      style={{backgroundColor: color}}
    >
      {isActive && <CheckIcon className="size-3" />}
    </button>
  );
}
