import {ButtonVariant} from './get-shared-button-style';

export type ButtonSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | null;

interface Props {
  padding?: string;
  equalWidth?: boolean;
  variant?: ButtonVariant;
}

export function getButtonSizeStyle(
  size?: ButtonSize,
  {padding, equalWidth, variant}: Props = {},
): string {
  switch (size) {
    case '2xs':
      if (variant === 'link') return 'text-xs';
      return `text-xs h-6 ${equalWidth ? 'w-6' : padding || 'px-2.5'}`;
    case 'xs':
      if (variant === 'link') return 'text-xs';
      return `text-sm h-7.5 ${equalWidth ? 'w-7.5' : padding || 'px-3.5'}`;
    case 'sm':
      if (variant === 'link') return 'text-sm';
      return `text-sm h-9 ${equalWidth ? 'w-9' : padding || 'px-4.5'}`;
    case 'md':
      if (variant === 'link') return 'text-base';
      return `text-base h-10.5 ${equalWidth ? 'w-10.5' : padding || 'px-5.5'}`;
    case 'lg':
      if (variant === 'link') return 'text-lg';
      return `text-base h-12.5 ${equalWidth ? 'w-12.5' : padding || 'px-6.5'}`;
    case 'xl':
      if (variant === 'link') return 'text-xl';
      return `text-lg h-15 ${equalWidth ? 'w-15' : padding || 'px-8'}`;
    default:
      return size || '';
  }
}
