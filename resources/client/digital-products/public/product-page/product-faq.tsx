import {getBootstrapData} from '@ui/bootstrap-data/bootstrap-data-store';
import {Trans} from '@ui/i18n/trans';
import type {ReactNode} from 'react';
import type {PublicDigitalProduct} from '../digital-product-public-pages';

type FaqEntry = {
  question: ReactNode;
  answer: ReactNode;
};

/**
 * Pre-purchase FAQ rendered inside the overview card. Every question and
 * answer is system copy (<Trans>); the only product-specific value
 * interpolated is the server-published file-format hint for this product
 * type (App\Storefront\ProductFileFormats via bootstrap data).
 *
 * Only system-true questions are asked: receipt delivery, the My Orders
 * email-code portal, file formats and guest checkout — plus the one refund
 * stance this repo can state as fact: delivery is instant, so refunds rest
 * with the creator. No window, guarantee, or support promise is offered
 * because none exists to state.
 */
export function ProductFaq({product}: {product: PublicDigitalProduct}) {
  const isCourse = !!product.is_course;
  const isFree = product.payment_mode === 'free';
  const formats = getBootstrapData()?.product_file_formats;
  const formatHint = formats
    ? isCourse
      ? undefined
      : formats[(product.type ?? 'digital') as keyof typeof formats]?.hint
    : undefined;

  const entries: FaqEntry[] = [
    {
      question: <Trans message="How do I receive my purchase?" />,
      answer: isFree ? (
        <Trans message="Complete the free checkout, then use your email to access the product in My Portal." />
      ) : isCourse ? (
        <Trans message="As soon as your payment is confirmed, we email your receipt to the address you used at checkout." />
      ) : (
        <Trans message="As soon as your payment is confirmed, we email a receipt with your protected download links to the address you used at checkout." />
      ),
    },
    {
      question: <Trans message="How do I access my purchase later?" />,
      answer: (
        <Trans
          message="Open :link and enter the email you used at checkout — we send a 6-digit sign-in code, and your purchases and downloads are listed there."
          values={{link: <MyOrdersLink />}}
        />
      ),
    },
  ];

  if (isCourse) {
    entries.push({
      question: <Trans message="How do I start my course?" />,
      answer: (
        <Trans
          message="Course access is added to the account with your checkout email. Create or sign in to that account, and your course appears in :link under My courses."
          values={{link: <MyOrdersLink />}}
        />
      ),
    });
  } else if (formatHint) {
    entries.push({
      question: <Trans message="Which file formats does this product use?" />,
      answer: (
        <Trans
          message="Files for this product type are provided as :hint."
          values={{hint: formatHint}}
        />
      ),
    });
  }

  entries.push({
    question: <Trans message="Do I need an account to buy?" />,
    answer: (
      <Trans message="No — checkout only asks for your name and email, and your purchases stay tied to that email address." />
    ),
  });

  if (!isFree) {
    entries.push({
      question: <Trans message="What is the refund policy?" />,
      answer: (
        <Trans message="Digital delivery is instant; refunds are at the creator's discretion. Contact the creator through their store if something is wrong with your purchase." />
      ),
    });
  }

  return (
    <section className="flex min-w-0 flex-col gap-3 border-t border-[var(--biolink-border)] pt-5">
      <h3 className="text-sm font-semibold">
        <Trans message="Frequently asked questions" />
      </h3>
      <dl className="flex flex-col gap-4">
        {entries.map((entry, index) => (
          <div key={index} className="flex min-w-0 flex-col gap-1">
            <dt className="text-sm font-medium text-[var(--biolink-text)] break-words [overflow-wrap:anywhere]">
              {entry.question}
            </dt>
            <dd className="text-base leading-7 text-[var(--biolink-muted-text)] break-words [overflow-wrap:anywhere]">
              {entry.answer}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function MyOrdersLink() {
  return (
    <a
      href="/my-portal"
      className="font-medium text-[var(--biolink-text)] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4"
    >
      <Trans message="My Portal" />
    </a>
  );
}
