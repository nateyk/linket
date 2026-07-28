import {ReactNode} from 'react';

interface Props {
  id: string;
  title: ReactNode;
  titleSuffix?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
}
export function AccountSettingsPanel({
  id,
  title,
  titleSuffix,
  children,
  actions,
}: Props) {
  return (
    <section
      id={id}
      className="mb-6 w-full overflow-hidden rounded-card border bg-card"
    >
      <div className="flex items-center gap-3.5 border-b bg-secondary/70 px-6 py-4">
        <div className="text-base font-semibold">{title}</div>
        {titleSuffix && <div className="ml-auto">{titleSuffix}</div>}
      </div>
      <div className="p-6">{children}</div>
      {actions && (
        <div className="flex justify-end border-t px-6 py-4">{actions}</div>
      )}
    </section>
  );
}
