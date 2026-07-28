import {CSSProperties} from 'react';
import {BackgroundSelectorConfig} from '../background-selector-config';

type BackgroundCssProperties = CSSProperties & {
  '--bg-pattern-front'?: string;
  '--bg-pattern-back'?: string;
  '--bg-pattern-size'?: string;
};

export function cssPropsFromBgConfig(
  bgConfig?: Partial<BackgroundSelectorConfig>,
): CSSProperties | undefined {
  if (bgConfig) {
    const style: BackgroundCssProperties = {
      backgroundImage: bgConfig.backgroundImage,
      backgroundColor: bgConfig.backgroundColor,
      backgroundAttachment: bgConfig.backgroundAttachment,
      backgroundSize: bgConfig.backgroundSize,
      backgroundRepeat: bgConfig.backgroundRepeat,
      backgroundPosition: bgConfig.backgroundPosition,
      color: bgConfig.color,
      '--bg-pattern-front':
        bgConfig.patternFrontColor ?? 'rgba(255, 255, 255, 0.3)',
      '--bg-pattern-back': bgConfig.backgroundColor,
      '--bg-pattern-size': `${Math.max(1, bgConfig.patternSize ?? 5)}px`,
    };
    return style;
  }
}

export function getBgTintStyle(tint?: number): CSSProperties | undefined {
  if (tint == null || tint === 50) {
    return undefined;
  }

  const clampedTint = Math.max(0, Math.min(100, tint));
  const opacity =
    clampedTint < 50
      ? ((50 - clampedTint) / 50) * 0.8
      : ((clampedTint - 50) / 50) * 0.8;

  return {
    backgroundColor: clampedTint < 50 ? 'rgb(0 0 0)' : 'rgb(255 255 255)',
    opacity,
  };
}
