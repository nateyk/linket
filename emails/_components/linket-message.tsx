import { Button, Heading, Text } from 'react-email';
import { LinketShell } from './linket-shell';

export interface LinketMessageProps {
  preview: string;
  heading: string;
  lines: string[];
  actionLabel?: string;
  actionUrl?: string;
  note?: string;
}

export function LinketMessage({
  preview,
  heading,
  lines,
  actionLabel,
  actionUrl,
  note,
}: LinketMessageProps) {
  return (
    <LinketShell preview={preview}>
      <Heading as="h1" className="m-0 mb-4 text-2xl font-semibold text-ink">
        {heading}
      </Heading>
      {lines.map((line, index) => (
        <Text key={`${index}-${line}`} className="m-0 mb-3 text-base text-ink">
          {line}
        </Text>
      ))}
      {actionLabel && actionUrl ? (
        <Button
          href={actionUrl}
          className="box-border mt-2 rounded-full bg-brand px-5 py-3 text-center text-sm font-medium text-white no-underline"
        >
          {actionLabel}
        </Button>
      ) : null}
      {note ? <Text className="mt-6 mb-0 text-sm text-muted">{note}</Text> : null}
    </LinketShell>
  );
}
