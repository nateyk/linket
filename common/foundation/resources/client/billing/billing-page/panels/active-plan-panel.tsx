import {User} from '@app/gen/schemas/user';
import {BillingPlanPanel} from '@common/billing/billing-page/billing-plan-panel';
import {FormattedPrice} from '@common/billing/formatted-price';
import {SectionHelper} from '@common/ui/other/section-helper';
import {LinkButton} from '@shadcn/button/button';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {Trans} from '@ui/i18n/trans';
import {Fragment, ReactElement} from 'react';
import {useOutletContext} from 'react-router';

export function ActivePlanPanel() {
  const data = useOutletContext<User>();

  if (!data.subscription || !data.subscription.product) {
    return null;
  }

  const renewDate = (
    <FormattedDate preset="long" date={data.subscription.renews_at} />
  );

  return (
    <Fragment>
      {data.subscription.past_due ? <PastDueMessage /> : null}
      <BillingPlanPanel title={<Trans message="Current plan" />}>
        <div className="mt-6 flex justify-between gap-5">
          <div>
            <div className="mb-0.5 text-xl font-bold">
              {data.subscription.product.name}
            </div>
            <FormattedPrice
              className="mb-0.5 text-xl"
              price={data.subscription.price}
            />
            <div className="text-base">
              <RenewMessage
                subscription={data.subscription}
                renewDate={renewDate}
              />
            </div>
          </div>
          {data.subscription.gateway_name === 'none' ? null : (
            <div className="flex w-58 flex-col gap-3">
              <LinkButton
                variant="default"
                color="primary"
                size="lg"
                to="change-plan"
                className="flex-1"
              >
                <Trans message="Change plan" />
              </LinkButton>
              <LinkButton
                variant="outline"
                color="danger"
                size="lg"
                className="flex-1"
                to="cancel"
              >
                <Trans message="Cancel plan" />
              </LinkButton>
            </div>
          )}
        </div>
      </BillingPlanPanel>
    </Fragment>
  );
}

type RenewMessageProps = {
  subscription: NonNullable<User['subscription']>;
  renewDate: ReactElement;
};
function RenewMessage({subscription, renewDate}: RenewMessageProps) {
  if (subscription.on_trial) {
    return (
      <Trans
        message="You will be automatically charged after your free trial ends on :date."
        values={{date: renewDate}}
      />
    );
  }

  return (
    <Trans message="Your plan renews on :date" values={{date: renewDate}} />
  );
}

function PastDueMessage() {
  return (
    <SectionHelper
      className="mb-6"
      color="danger"
      title="Payment is past due"
      description="Your recent recurring payment has failed with the payment method we have on file. Please update your payment method to avoid any service interruptions."
    />
  );
}
