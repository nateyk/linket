import {BackgroundSelectorConfig} from '@common/background-selector/background-selector-config';

export const patternBackgrounds: BackgroundSelectorConfig[] = [
  {
    backgroundImage:
      'linear-gradient(45deg, rgb(255, 255, 255) 50%, rgb(26, 32, 44) 50%)',
  },
  {
    backgroundImage:
      'linear-gradient(-45deg, rgb(255, 255, 255) 50%, rgb(26, 32, 44) 50%)',
  },
  {
    backgroundImage:
      'linear-gradient(0deg, rgb(255, 255, 255) 50%, rgb(26, 32, 44) 50%)',
  },
  {
    backgroundImage:
      'linear-gradient(90deg, rgb(255, 255, 255) 50%, rgb(26, 32, 44) 50%)',
  },
  {
    backgroundImage:
      'radial-gradient(rgb(255, 255, 255) 0.4px, rgb(26, 32, 44) 0.4px) 0% 0% / 8px 8px',
  },
  {
    backgroundImage:
      'radial-gradient(rgb(255, 255, 255) 0.4px, rgba(0, 0, 0, 0) 0.4px), radial-gradient(rgb(255, 255, 255) 0.4px, rgb(26, 32, 44) 0.4px)',
    backgroundPosition: '0px 0px, 4px 4px',
  },
  {
    backgroundImage:
      'repeating-linear-gradient(45deg, rgb(255, 255, 255), rgb(255, 255, 255) 1px, rgb(26, 32, 44) 1px, rgb(26, 32, 44) 10px)',
  },
  {
    backgroundImage:
      'repeating-linear-gradient(-45deg, rgb(255, 255, 255), rgb(255, 255, 255) 1px, rgb(26, 32, 44) 1px, rgb(26, 32, 44) 10px)',
  },
  {
    backgroundImage:
      'linear-gradient(rgb(255, 255, 255) 0.8px, rgba(0, 0, 0, 0) 0.8px), linear-gradient(90deg, rgb(255, 255, 255) 0.8px, rgba(0, 0, 0, 0) 0.8px), linear-gradient(rgb(255, 255, 255) 0.4px, rgba(0, 0, 0, 0) 0.4px), linear-gradient(90deg, rgb(255, 255, 255) 0.4px, rgb(26, 32, 44) 0.4px)',
  },
  {
    backgroundImage:
      'linear-gradient(rgb(255, 255, 255) 0.8px, transparent 0.8px), linear-gradient(90deg, rgb(255, 255, 255) 0.8px, transparent 0.8px), linear-gradient(rgb(255, 255, 255) 0.4px, transparent 0.4px), linear-gradient(90deg, rgb(255, 255, 255) 0.4px, rgb(26, 32, 44) 0.4px)',
  },
  {
    backgroundImage:
      'linear-gradient(0deg, rgb(26, 32, 44) 50%, rgb(255, 255, 255) 50%) 0% 0% / 8px 8px',
  },
  {
    backgroundImage:
      'linear-gradient(to right, rgb(255, 255, 255), rgb(255, 255, 255) 4px, rgb(26, 32, 44) 4px, rgb(26, 32, 44)',
  },
];

export const patternColorPresets = [
  ['rgb(178, 163, 132)', 'rgb(246, 101, 78)'],
];
