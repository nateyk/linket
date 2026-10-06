import type {ReactNode} from 'react';

/**
 * Page heading shared by every editor tab (Content, About, Appearance):
 * an h2 with a muted one-line description, so each tab opens with the same
 * rhythm regardless of what it contains.
 */
export function SectionHeading({
  title,
  description,
}: {
  title: ReactNode;
  description: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
