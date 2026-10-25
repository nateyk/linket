import {ColorfulHeader} from '@app/help-center/homepage/colorful-header';
import {HcLandingContent} from '@app/help-center/homepage/hc-landing-content';
import {SimpleHeader} from '@app/help-center/homepage/simple-header';
import {Footer} from '@common/ui/footer/footer';
import {useSettings} from '@ui/settings/use-settings';

export function Component() {
  const {hcLanding} = useSettings();
  const headerVariant = hcLanding?.header?.variant ?? 'colorful';

  return (
    <div className="isolate min-h-screen bg-background">
      {headerVariant === 'simple' ? <SimpleHeader /> : <ColorfulHeader />}
      <div className="container relative z-10 mx-auto mb-60 max-w-7xl bg-background px-6 pb-24 pt-10 md:px-10 md:pt-14">
        <main>
          <HcLandingContent />
        </main>
      </div>
      {hcLanding?.show_footer ? <Footer className="px-40" /> : null}
    </div>
  );
}
