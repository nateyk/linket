import { Button, Heading, Text } from 'react-email';
import { LinketShell } from './_components/linket-shell';

export interface PasswordResetEmailProps {
  name: string;
  resetUrl: string;
  expiresInMinutes: number;
  siteName: string;
}

export default function PasswordResetEmail({
  name,
  resetUrl,
  expiresInMinutes,
  siteName,
}: PasswordResetEmailProps) {
  return (
    <LinketShell preview={`Reset your ${siteName} password`}>
      <Heading as="h1" className="m-0 mb-4 text-2xl font-semibold text-ink">
        Reset your password
      </Heading>
      <Text className="m-0 mb-4 text-base text-ink">
        Hi {name}, we received a request to reset your {siteName} password.
      </Text>
      <Button
        href={resetUrl}
        className="box-border rounded-full bg-brand px-5 py-3 text-center text-sm font-medium text-white no-underline"
      >
        Reset password
      </Button>
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
} satisfies PasswordResetEmailProps;