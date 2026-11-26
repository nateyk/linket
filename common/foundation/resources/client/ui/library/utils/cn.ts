import {clsx, type ClassValue} from 'clsx';
import {extendTailwindMerge} from 'tailwind-merge';

const customTwMerge = extendTailwindMerge({
  extend: {
    theme: {
      radius: ['button', 'badge', 'input', 'card', 'card-sm', 'card-xs'],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return customTwMerge(clsx(inputs));
}
