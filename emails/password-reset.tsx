import { Heading, Text } from 'react-email';
import { LinketButton } from './_components/linket-button';
import { LinketShell } from './_components/linket-shell';

export interface PasswordResetEmailProps {
  name: string;
  resetUrl: string;
  expiresInMinutes: number;
  siteName: string;
  logoUrl?: string | null;
  buttonBorderRadiusPx?: number;
}

export default function PasswordResetEmail({
  name,
  resetUrl,
  expiresInMinutes,
  siteName,
  logoUrl = null,
  buttonBorderRadiusPx = 24,
}: PasswordResetEmailProps) {
  return (
    <LinketShell preview={`Reset your ${siteName} password`} logoUrl={logoUrl} siteName={siteName}>
      <Heading as="h1" className="m-0 mb-4 text-2xl font-semibold text-ink">
        Reset your password
      </Heading>
      <Text className="m-0 mb-4 text-base text-ink">
        Hi {name}, we received a request to reset your {siteName} password.
      </Text>
      <LinketButton href={resetUrl} buttonBorderRadiusPx={buttonBorderRadiusPx}>
        Reset password
      </LinketButton>
      <Text className="mt-6 mb-0 text-sm text-muted">
        This link expires in {expiresInMinutes} minutes. If you did not request a reset, you can
        ignore this email.
      </Text>
    </LinketShell>
  );
}

PasswordResetEmail.PreviewProps = {
  name: 'Ada',
  resetUrl: 'https://example.com/password/reset/demo-token',
  expiresInMinutes: 60,
  siteName: 'Linket',
  buttonBorderRadiusPx: 24,
} satisfies PasswordResetEmailProps;
