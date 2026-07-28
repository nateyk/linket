import {BillingPlanPanel} from '@common/billing/billing-page/billing-plan-panel';
import {FormattedPrice} from '@common/billing/formatted-price';
import {LinkButton} from '@shadcn/button/button';
import {FormattedDateTimeRange} from '@ui/i18n/formatted-date-time-range';
import {Trans} from '@ui/i18n/trans';
import {useCurrentDateTime} from '@ui/i18n/use-current-date-time';

export function FreePlanPanel() {
  const now = useCurrentDateTime();
  const end = now.add({months: 1});

  return (
    <>
      <BillingPlanPanel title={<Trans message="Current plan" />}>
        <div className="mt-6 flex justify-between gap-5">
          <div>
            <div className="mb-0.5 text-xl font-bold">
              <Trans message="Free plan" />
            </div>
            <FormattedPrice
              className="mb-0.5 text-xl"
              price={{
                amount: 0,
                currency: 'USD',
                interval: 'month',
                interval_count: 1,
              }}
            />
            <div className="text-base">
              <Trans
                message="Billing cycle: :date"
                values={{
                  date: <FormattedDateTimeRange start={now} end={end} />,
                }}
              />
            </div>
          </div>
          <LinkButton
            variant="default"
            color="primary"
            size="lg"
            to="/pricing"
            className="w-58"
          >
            <Trans message="Upgrade" />
          </LinkButton>
        </div>
      </BillingPlanPanel>
    </>
  );
}
