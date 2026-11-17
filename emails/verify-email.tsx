import { Heading, Link, Text } from 'react-email';
import { LinketShell } from './_components/linket-shell';

export interface VerifyEmailProps {
  otp: string;
  expiresInMinutes: number;
  accountSettingsUrl: string;
  siteName: string;
}

export default function VerifyEmail({
  otp,
  expiresInMinutes,
  accountSettingsUrl,
  siteName,
}: VerifyEmailProps) {
  return (
    <LinketShell preview={`${siteName} security code`}>
      <Heading as="h1" className="m-0 mb-4 text-2xl font-semibold text-ink">
        Your {siteName} security code
      </Heading>
      <Text className="m-0 mb-6 text-5xl font-bold tracking-wide text-ink">{otp}</Text>
      <Text className="m-0 mb-4 text-base text-ink">
        This code will expire in {expiresInMinutes} minutes.
      </Text>
      <Text className="m-0 text-sm text-muted">
        If you did not request this code, go to{' '}
        <Link href={accountSettingsUrl} className="text-brand no-underline">
          Account settings
        </Link>{' '}
        and change your password right away.
      </Text>
    </LinketShell>
  );
}

VerifyEmail.PreviewProps = {
  otp: '482913',
  expiresInMinutes: 30,
  accountSettingsUrl: 'https://example.com/account-settings',
  siteName: 'Linket',
} satisfies VerifyEmailProps;