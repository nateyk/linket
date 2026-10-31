import {memo} from 'react';
import clsx from 'clsx';

interface Props {
  src: string;
  className?: string;
  height?: string | false;
}

/**
 * Keep SVG bytes inside the browser's passive image context.
 * Inserting fetched SVG as HTML can execute attacker-supplied markup.
 */
export const SvgImage = memo(({src, className, height = 'h-full'}: Props) => (
  <img
    src={src}
    alt=""
    className={clsx(
      'svg-image-container inline-block bg-no-repeat',
      height,
      className,
    )}
  />
));
