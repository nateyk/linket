import { Heading, Link, Text } from 'react-email';
import { LinketShell } from './_components/linket-shell';

export interface PortalSignInEmailProps {
  otp: string;
  expiresInMinutes: number;
  portalUrl: string;
  siteName: string;
  logoUrl?: string | null;
  buttonBorderRadiusPx?: number;
}

export default function PortalSignInEmail({
  otp,
  expiresInMinutes,
  portalUrl,
  siteName,
  logoUrl = null,
}: PortalSignInEmailProps) {
  return (
    <LinketShell
      preview={`Your ${siteName} My Portal sign-in code`}
      logoUrl={logoUrl}
      siteName={siteName}
      footerNote={`You received this email because someone requested a My Portal sign-in code for your purchases on ${siteName}.`}
    >
      <Heading as="h1" className="m-0 mb-4 text-2xl font-semibold text-ink">
        Your My Portal sign-in code
      </Heading>
      <Text className="m-0 mb-6 text-5xl font-bold tracking-wide text-ink">{otp}</Text>
      <Text className="m-0 mb-4 text-base text-ink">
        This code expires in {expiresInMinutes} minutes. Enter it on My Portal to access your
        purchases.
      </Text>
      <Text className="m-0 text-sm text-muted">
        Open{' '}
        <Link href={portalUrl} className="text-brand no-underline">
          My Portal
        </Link>{' '}
        if you still need to enter the code. If you did not request this, you can ignore this email.
      </Text>
    </LinketShell>
  );
}

PortalSignInEmail.PreviewProps = {
  otp: '482913',
  expiresInMinutes: 10,
  portalUrl: 'https://example.com/my-portal',
  siteName: 'Linket',
} satisfies PortalSignInEmailProps;
