import { Heading, Text } from 'react-email';
import { LinketButton } from './_components/linket-button';
import { LinketShell } from './_components/linket-shell';

export interface RenewalReminderEmailProps {
  name: string;
  planName: string;
  daysBefore: number;
  renewUrl: string;
  siteName: string;
  logoUrl?: string | null;
  buttonBorderRadiusPx?: number;
}

export default function RenewalReminderEmail({
  name,
  planName,
  daysBefore,
  renewUrl,
  siteName,
  logoUrl = null,
  buttonBorderRadiusPx = 24,
}: RenewalReminderEmailProps) {
  const dayLabel = daysBefore === 1 ? '1 day' : `${daysBefore} days`;

  return (
    <LinketShell
      preview={`Your ${planName} renewal is coming up`}
      logoUrl={logoUrl}
      siteName={siteName}
    >
      <Heading as="h1" className="m-0 mb-4 text-2xl font-semibold text-ink">
        Your {planName} renewal is coming up
      </Heading>
      <Text className="m-0 mb-4 text-base text-ink">Hello, {name}</Text>
      <Text className="m-0 mb-4 text-base text-ink">
        Your {planName} subscription renews in {dayLabel}.
      </Text>
      <Text className="m-0 mb-6 text-base text-ink">
        Pay by direct transfer in Billing to keep Pro active without interruption.
      </Text>
      <LinketButton href={renewUrl} buttonBorderRadiusPx={buttonBorderRadiusPx}>
        Renew Pro
      </LinketButton>
    </LinketShell>
  );
}

RenewalReminderEmail.PreviewProps = {
  name: 'Ada',
  planName: 'Pro',
  daysBefore: 7,
  renewUrl: 'https://example.com/account-settings/billing',
  siteName: 'Linket',
  buttonBorderRadiusPx: 24,
} satisfies RenewalReminderEmailProps;
