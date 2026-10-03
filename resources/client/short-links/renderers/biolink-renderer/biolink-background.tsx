import {BiolinkAppearanceConfig} from '@app/gen/schemas/biolink-appearance-config';
import {
  getImageBackgroundEffectStyle,
  ImageBackgroundEffectOverlay,
} from '@common/background-selector/image-background-effect';
import {NoiseFilter} from '@common/background-selector/images/noise-filter';
import {
  cssPropsFromBgConfig,
  getBgTintStyle,
} from '@common/background-selector/utils/css-props-from-bg-config';
import {cn} from '@ui/utils/cn';

interface BackgroundProps {
  appearance: BiolinkAppearanceConfig | null;
  className?: string;
  /**
   * Glue the gradient/image layer to the viewport
   * (`background-attachment: fixed`) instead of this element's box.
   *
   * The page-level instance sits in a `fixed inset-0` wrapper whose fixed
   * containing block is the `@container` root (layout containment), so its
   * base layer spans the whole document and scrolls with it. Anything that
   * repaints the same background inside a sticky element — the opaque tab
   * strip on the creator profile — would drift against that while scrolling
   * unless both copies share one viewport-sized positioning area.
   */
  viewportFixed?: boolean;
  /**
   * Skip the SVG noise-filter definition. The page-level instance always
   * renders one, `url(#noiseFilter)` resolves document-wide, and a second
   * copy would only be a duplicate `id`.
   */
  omitNoiseDef?: boolean;
}

export function Background({
  appearance,
  className,
  viewportFixed = false,
  omitNoiseDef = false,
}: BackgroundProps) {
  const bgTintStyle = getBgTintStyle(appearance?.bgConfig?.tint);
  const bgEffectStyle = getImageBackgroundEffectStyle(
    appearance?.bgConfig?.imageEffect,
    appearance?.bgConfig?.noise,
  );

  return (
    <div
      className={cn(
        'pointer-events-none absolute size-full overflow-hidden',
        className,
      )}
    >
      <div
        className="absolute inset-0 mx-auto"
        style={{
          ...cssPropsFromBgConfig(appearance?.bgConfig),
          ...(viewportFixed ? {backgroundAttachment: 'fixed'} : {}),
          ...bgEffectStyle,
        }}
      />
      <ImageBackgroundEffectOverlay
        effect={appearance?.bgConfig?.imageEffect}
      />
      {bgTintStyle && (
        <div className="absolute inset-0 mx-auto" style={bgTintStyle} />
      )}
      {appearance?.bgConfig?.noise && !omitNoiseDef && <NoiseFilter />}
    </div>
  );
}
