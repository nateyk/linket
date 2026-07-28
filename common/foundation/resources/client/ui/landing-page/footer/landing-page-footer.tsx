import {Footer} from '@common/ui/footer/footer';

export type LandingPageFooterConfig = {
  name: 'footer';
};

type Props = {
  config: LandingPageFooterConfig;
};

export function LandingPageFooter({config}: Props) {
  return (
    <Footer
      className="mx-auto max-w-7xl"
      padding="px-6 lg:px-8 pb-7 pt-24 md:pb-13.5"
    />
  );
}
