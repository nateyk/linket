import {ComponentPropsWithRef} from 'react';

export const LinkStyle =
  'text-primary hover:underline focus-visible:ring focus-visible:ring-2 focus-visible:ring-offset-2 outline-hidden rounded-sm transition-colors';

interface ExternalLinkProps extends ComponentPropsWithRef<'a'> {}
export function ExternalLink({
  children,
  className,
  target = '_blank',
  ...domProps
}: ExternalLinkProps) {
  return (
    <a className={LinkStyle} target={target} {...domProps}>
      {children}
    </a>
  );
}
