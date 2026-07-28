import { Button } from '@ui/buttons/button';
import { Trans } from '@ui/i18n/trans';
import { Link } from 'react-router';
import imgUrl1 from './404-1.png';
import imgUrl2 from './404-2.png';

export function NotFoundPage() {
  return (
    <div className="isolate flex flex-col-reverse items-center justify-center gap-16 px-4 py-24 md:gap-28 md:px-44 md:py-20 lg:flex-row lg:px-24 lg:py-24">
      <div className="relative w-full pb-12 lg:pb-0 xl:w-1/2 xl:pt-24">
        <div className="relative">
          <div className="absolute">
            <div className="relative z-10">
              <h1 className="my-2 text-2xl font-bold text-foreground">
                <Trans message="Looks like you've found the doorway to the great nothing" />
              </h1>
              <p className="my-4 text-foreground">
                <Trans
                  message="Sorry about that! Please visit our homepage to get where you need
                to go."
                />
              </p>
              <Button
                className="my-2"
                elementType={Link}
                size="lg"
                to="/"
                variant="flat"
                color="primary"
              >
                <Trans message="Take me there!" />
              </Button>
            </div>
          </div>
          <div className="dark:opacity-5">
            <img src={imgUrl2 as any} alt="" />
          </div>
        </div>
      </div>
      <div className="dark:opacity-80">
        <img src={imgUrl1 as any} alt="" />
      </div>
    </div>
  );
}
