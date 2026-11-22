import { Heading, Text } from 'react-email';
import { LinketShell } from './_components/linket-shell';

export interface OpsAlertEmailProps {
  preview: string;
  heading: string;
  body: string;
  note?: string;
  siteName?: string;
  logoUrl?: string | null;
}

export default function OpsAlertEmail({
  preview,
  heading,
  body,
  note,
  siteName = 'Linket',
  logoUrl = null,
}: OpsAlertEmailProps) {
  return (
    <LinketShell
      preview={preview}
      logoUrl={logoUrl}
      siteName={siteName}
      footerNote={`Operational alert from ${siteName}.`}
    >
      <Heading as="h1" className="m-0 mb-4 text-2xl font-semibold text-ink">
        {heading}
      </Heading>
      <Text className="m-0 mb-3 text-base text-ink">{body}</Text>
      {note ? <Text className="mt-6 mb-0 text-sm text-muted">{note}</Text> : null}
    </LinketShell>
  );
}

OpsAlertEmail.PreviewProps = {
  preview: 'Payment needs review',
  heading: 'Payment needs review',
  body: 'A buyer payment needs your review in Linket.',
  note: 'Open the creator dashboard to continue.',
  siteName: 'Linket',
} satisfies OpsAlertEmailProps;
