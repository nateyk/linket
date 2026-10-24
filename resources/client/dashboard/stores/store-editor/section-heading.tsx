import type {ReactNode} from 'react';

/**
 * Tab / panel heading on Operate surfaces. Matches DESIGN.md:
 * section title (20/600/28) + label helper (14/400/20).
 */
export function SectionHeading({
  title,
  description,
}: {
  title: ReactNode;
  description: ReactNode;
}) {
  return (
    <div className="mb-1 flex flex-col gap-1">
      <h2 className="text-xl leading-7 font-semibold tracking-tight">
        {title}
      </h2>
      <p className="text-sm leading-5 font-normal text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
