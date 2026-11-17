import { Button, Heading, Link, Text } from 'react-email';
import { LinketShell } from './_components/linket-shell';

export interface OrderConfirmationEmailProps {
  buyerName: string;
  productName: string;
  orderId: string;
  amountLabel: string;
  storeName?: string;
  downloads: Array<{ name: string; url: string }>;
  expiresAtLabel?: string;
  downloadLimitLabel?: string;
}

export default function OrderConfirmationEmail({
  buyerName,
  productName,
  orderId,
  amountLabel,
  storeName,
  downloads,
  expiresAtLabel,
  downloadLimitLabel,
}: OrderConfirmationEmailProps) {
  const primaryUrl = downloads[0]?.url;

  return (
    <LinketShell preview={`Your receipt for ${productName}`}>
      <Heading as="h1" className="m-0 mb-4 text-2xl font-semibold text-ink">
        Thanks for your purchase
      </Heading>
      <Text className="m-0 mb-4 text-base text-ink">
        Hi {buyerName}, your order for <strong>{productName}</strong>
        {storeName ? <> from {storeName}</> : null} is confirmed.
      </Text>
      <Text className="m-0 mb-1 text-sm text-muted">Order {orderId}</Text>
      <Text className="m-0 mb-6 text-sm text-muted">Total {amountLabel}</Text>
      {primaryUrl ? (
        <Button
          href={primaryUrl}
          className="box-border rounded-full bg-brand px-5 py-3 text-center text-sm font-medium text-white no-underline"
        >
          Download files
        </Button>
      ) : null}
      {downloads.length > 0 ? (
        <>
          <Text className="mt-6 mb-2 text-sm font-medium text-ink">Your downloads</Text>
          {downloads.map((file) => (
            <Text key={file.url} className="m-0 mb-1 text-sm">
              <Link href={file.url} className="text-brand no-underline">
                {file.name}
              </Link>
            </Text>
          ))}
        </>
      ) : null}
      {expiresAtLabel ? (
        <Text className="mt-4 mb-0 text-xs text-muted">Links expire {expiresAtLabel}.</Text>
      ) : null}
      {downloadLimitLabel ? (
        <Text className="mt-1 mb-0 text-xs text-muted">{downloadLimitLabel}</Text>
      ) : null}
    </LinketShell>
  );
}

OrderConfirmationEmail.PreviewProps = {
  buyerName: 'Ada',
  productName: 'Launch Checklist',
  orderId: 'ord_demo_123',
  amountLabel: '250.00 ETB',
  storeName: 'Ada Studio',
  downloads: [
    { name: 'checklist.pdf', url: 'https://example.com/download/1' },
    { name: 'bonus.zip', url: 'https://example.com/download/2' },
  ],
  expiresAtLabel: 'in 7 days',
  downloadLimitLabel: 'Each file can be downloaded up to 10 times.',
} satisfies OrderConfirmationEmailProps;