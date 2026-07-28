import {useLandingPageData} from '@app/landing/use-landing-page-data';
import {FormattedNumber} from '@ui/i18n/formatted-number';
import {Trans} from '@ui/i18n/trans';
import {SvgIconProps} from '@ui/icons/svg-icon';
import {LinkIcon, MousePointerClickIcon, QrCodeIcon} from 'lucide-react';
import {ReactElement} from 'react';

export function LandingPageStats() {
  const query = useLandingPageData();

  return (
    <section className="bg-muted/50 dark:bg-card">
      <div className="compact-scrollbar mx-auto flex max-w-7xl justify-between gap-15 overflow-x-auto px-6 py-24 sm:py-32 lg:px-8">
        <StatLayout
          label={<Trans message="Total links shortened" />}
          icon={<LinkIcon className="size-10" />}
          number={query.data.stats.links}
        />
        <StatLayout
          label={<Trans message="Total events tracked" />}
          icon={<MousePointerClickIcon className="size-10" />}
          number={query.data.stats.clicks}
        />
        <StatLayout
          label={<Trans message="QR codes generated" />}
          icon={<QrCodeIcon className="size-10" />}
          number={query.data.stats.qrCodes}
        />
      </div>
    </section>
  );
}

interface StatLayoutProps {
  label: ReactElement;
  icon: ReactElement<SvgIconProps>;
  number: number;
}
function StatLayout({label, icon, number}: StatLayoutProps) {
  return (
    <div className="flex flex-1 items-center rounded-card border bg-card p-10">
      {icon}
      <div className="ml-6 border-l-2 pl-6">
        <div className="text-[15px] whitespace-nowrap uppercase">{label}</div>
        <div className="mt-1.5 text-3xl font-medium">
          <FormattedNumber value={number} />
        </div>
      </div>
    </div>
  );
}
