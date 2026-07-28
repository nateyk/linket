import {LinkOverlay} from '@app/gen/schemas/link-overlay';
import {Trans} from '@ui/i18n/trans';
import {ReactElement} from 'react';

export const LinkOverlayThemes = [
  {value: 'default', label: <Trans message="Default" />},
  {value: 'full-width', label: <Trans message="Full width" />},
  {value: 'rounded', label: <Trans message="Rounded" />},
  {value: 'pill', label: <Trans message="Pill" />},
];

export const LinkOverlayPositions = [
  {value: 'top-left', label: <Trans message="Top left" />},
  {value: 'top-right', label: <Trans message="Top right" />},
  {value: 'bottom-left', label: <Trans message="Bottom left" />},
  {value: 'bottom-right', label: <Trans message="Bottom right" />},
];

export const LinkOverlayColors: {
  value: keyof LinkOverlay['colors'];
  label: ReactElement;
}[] = [
  {value: 'bg-color', label: <Trans message="Background color" />},
  {value: 'text-color', label: <Trans message="Text color" />},
  {value: 'btn-bg-color', label: <Trans message="Button background" />},
  {value: 'btn-text-color', label: <Trans message="Button text" />},
  {value: 'label-bg-color', label: <Trans message="Label background" />},
  {value: 'label-color', label: <Trans message="Label text" />},
];
