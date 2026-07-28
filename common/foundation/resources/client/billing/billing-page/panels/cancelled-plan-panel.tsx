import {User} from '@app/gen/schemas/user';
import {FormattedPrice} from '@common/billing/formatted-price';
import {Badge} from '@shadcn/badge/badge';
import {LinkButton} from '@shadcn/button/button';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {Trans} from '@ui/i18n/trans';
import {CalendarIcon} from 'lucide-react';
import {useOutletContext} from 'react-router';
import {BillingPlanPanel} from '../billing-plan-panel';

export function CancelledPlanPanel() {
  const data = useOutletContext<User>();

  if (!data.subscription || !data.subscription.product) {
    return null;
  }

  const endingDate = (
    <span className="whitespace-nowrap">
      <FormattedDate preset="long" date={data.subscription.ends_at} />
    </span>
  );

  return (
    <BillingPlanPanel title={<Trans message="Current plan" />}>
      <div className="mt-6 flex flex-col justify-between gap-5">
        <div>
          <Badge className="mb-2.5 w-min" variant="destructive">
            <Trans message="Canceled" />
          </Badge>
          <div className="mb-0.5 text-xl font-bold">
            {data.subscription.product.name}
          </div>
          <FormattedPrice
            className="mb-2 text-xl"
            price={data.subscription.price}
          />
          <div className="flex items-center gap-2 text-base">
            <CalendarIcon className="size-5 text-muted-foreground" />
            <div className="flex-auto">
              {data.subscription.on_trial ? (
                <Trans
                  message="Trial will end on :date and you will not be charged."
                  values={{date: endingDate}}
                />
              ) : (
                <Trans
                  message="Your plan will be canceled on :date"
                  values={{date: endingDate}}
                />
              )}
            </div>
          </div>
        </div>
        <div className="w-58">
          <LinkButton
            variant="default"
            color="primary"
            size="lg"
            className="w-full"
            to="/billing/renew"
          >
            <Trans message="Renew plan" />
          </LinkButton>
        </div>
      </div>
    </BillingPlanPanel>
  );
}
