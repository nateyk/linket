import { Heading, Text } from 'react-email';
import { LinketButton } from './linket-button';
import { LinketShell } from './linket-shell';

export interface LinketMessageProps {
  preview: string;
  heading: string;
  lines: string[];
  actionLabel?: string;
  actionUrl?: string;
  note?: string;
  logoUrl?: string | null;
  siteName?: string;
  buttonBorderRadiusPx?: number;
}

export function LinketMessage({
  preview,
  heading,
  lines,
  actionLabel,
  actionUrl,
  note,
  logoUrl = null,
  siteName = 'Linket',
  buttonBorderRadiusPx = 24,
}: LinketMessageProps) {
  return (
    <LinketShell preview={preview} logoUrl={logoUrl} siteName={siteName}>
      <Heading as="h1" className="m-0 mb-4 text-2xl font-semibold text-ink">
        {heading}
      </Heading>
      {lines.map((line, index) => (
        <Text key={`${index}-${line}`} className="m-0 mb-3 text-base text-ink">
          {line}
        </Text>
      ))}
      {actionLabel && actionUrl ? (
        <LinketButton
          href={actionUrl}
          buttonBorderRadiusPx={buttonBorderRadiusPx}
          className="box-border mt-2 bg-brand px-5 py-3 text-center text-sm font-medium text-white no-underline"
        >
          {actionLabel}
        </LinketButton>
      ) : null}
      {note ? <Text className="mt-6 mb-0 text-sm text-muted">{note}</Text> : null}
    </LinketShell>
  );
}
