import {Link} from '@app/gen/schemas/link';
import {Button} from '@shadcn/button/button';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {cn} from '@ui/utils/cn';
import {ComponentProps, useCallback, useEffect, useRef, useState} from 'react';

export function RedirectCountdownButton({
  link,
  className,
  ...buttonProps
}: ComponentProps<typeof Button> & {link: Link}) {
  const settings = useSettings();
  const redirect_time = settings?.links?.redirect_time ?? 0;

  const intervalRef = useRef<any>(null);
  const countDownRef = useRef(redirect_time);
  const [countdown, setCountdown] = useState(countDownRef.current);

  const redirectToLongUrl = useCallback(() => {
    window.location.href = link.final_destination_url ?? link.long_url;
  }, [link]);

  useEffect(() => {
    if (!redirect_time) {
      return;
    }

    intervalRef.current = setInterval(() => {
      countDownRef.current--;
      if (countDownRef.current <= 0 && intervalRef.current) {
        clearInterval(intervalRef.current);
        redirectToLongUrl();
      }
      setCountdown(countDownRef.current);
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [redirect_time, setCountdown, redirectToLongUrl]);

  const buttonText =
    countdown > 0 ? (
      <Trans message="Redirect in :seconds" values={{seconds: countdown}} />
    ) : (
      <Trans message="Go to link" />
    );

  return (
    <Button
      {...buttonProps}
      className={cn('min-w-32', className)}
      onClick={() => {
        if (countdown <= 0) {
          redirectToLongUrl();
        }
      }}
    >
      {buttonText}
    </Button>
  );
}
