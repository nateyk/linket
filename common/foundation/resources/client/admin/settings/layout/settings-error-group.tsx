import clsx from 'clsx';
import {ReactNode, useEffect, useRef} from 'react';
import {useFormContext} from 'react-hook-form';

interface Props {
  children: (isInvalid: boolean) => ReactNode;
  name: string;
  separatorBottom?: boolean;
  separatorTop?: boolean;
}
export function SettingsErrorGroup({
  children,
  name,
  separatorBottom = true,
  separatorTop = true,
}: Props) {
  const {
    formState: {errors},
  } = useFormContext<Record<string, string>>();

  const ref = useRef<HTMLDivElement>(null);
  const error = errors[name];

  useEffect(() => {
    if (error) {
      ref.current?.scrollIntoView({behavior: 'smooth'});
    }
  }, [error]);

  return (
    <div
      className={clsx(
        separatorBottom && 'mb-5 border-b pb-5',
        separatorTop && 'mt-5 border-t pt-5',
        error && 'border-y-error',
      )}
      ref={ref}
    >
      {children(!!error)}
      {error && (
        <div
          className="mt-5 text-sm text-destructive"
          dangerouslySetInnerHTML={{__html: error.message!}}
        />
      )}
    </div>
  );
}
