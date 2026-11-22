import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Tailwind,
  Text,
} from 'react-email';
import type { ReactNode } from 'react';
import { linketEmailTailwindConfig } from './linket-theme';

interface LinketShellProps {
  preview: string;
  children: ReactNode;
  footerNote?: string;
  logoUrl?: string | null;
  siteName?: string;
}

export function LinketShell({
  preview,
  children,
  footerNote = 'You received this email because of activity on your Linket account.',
  logoUrl = null,
  siteName = 'Linket',
}: LinketShellProps) {
  return (
    <Html lang="en">
      <Tailwind config={linketEmailTailwindConfig}>
        <Head />
        <Body className="bg-page m-0 font-sans text-ink">
          <Preview>{preview}</Preview>
          <Container className="mx-auto my-8 max-w-[560px] px-4">
            <Section className="mb-6">
              {logoUrl ? (
                <Img
                  src={logoUrl}
                  alt={siteName}
                  height="32"
                  style={{ height: '32px', width: 'auto', maxWidth: '180px', display: 'block' }}
                />
              ) : (
                <Text className="m-0 text-xl font-semibold text-brand">{siteName}</Text>
              )}
            </Section>
            <Section className="rounded-2xl border border-solid border-line bg-card px-8 py-8">
              {children}
            </Section>
            <Hr className="border border-solid border-line my-8" />
            <Text className="m-0 text-center text-xs text-muted">{footerNote}</Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
