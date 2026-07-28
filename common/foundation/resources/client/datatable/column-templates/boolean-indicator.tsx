import {CheckIcon, XIcon} from 'lucide-react';

interface BooleanIndicatorProps {
  value: boolean;
}
export function BooleanIndicator({value}: BooleanIndicatorProps) {
  if (value) {
    return <CheckIcon className="size-4 text-positive" />;
  }
  return <XIcon className="size-4 text-destructive" />;
}
