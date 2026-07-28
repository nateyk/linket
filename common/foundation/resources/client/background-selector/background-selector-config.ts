import type {ImageBackgroundEffect} from './image-background-effect';

export type BackgroundSelectorConfig = {
  tint?: number;
  noise?: boolean;
  imageEffect?: ImageBackgroundEffect;
  patternFrontColor?: string;
  patternSize?: number;
  activeType?: 'color' | 'pattern' | 'gradient' | 'image';
  backgroundAttachment?:
    | 'scroll'
    | 'fixed'
    | 'local'
    | 'initial'
    | 'inherit'
    | string;
  backgroundColor?: string;
  backgroundSize?:
    | 'auto'
    | 'cover'
    | 'contain'
    | 'initial'
    | 'inherit'
    | string;
  backgroundRepeat?: 'repeat' | 'no-repeat' | 'repeat-x' | 'repeat-y' | string;
  backgroundPosition?: string;
  backgroundImage?: string;
  color?: string;
};
