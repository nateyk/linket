import {
  useBiolinkEditorStore,
  StoreSaveError,
} from '@app/dashboard/stores/store-editor/biolink-editor-store';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {useEffect, useRef} from 'react';

/**
 * Field keys the save endpoints may reject → the exact labels the form
 * already uses for them (so the links read like the fields they jump to).
 */
const FIELD_LABELS: Record<string, ReturnType<typeof message>> = {
  display_name: message('Display name'),
  profile_title: message('Profile title'),
  bio: message('Short bio'),
  skills: message('Skills'),
  about_html: message('About content'),
  avatar_url: message('Profile photo'),
  cover_url: message('Cover image'),
  contact_url: message('Custom message link'),
  available_for_work: message('Available for work'),
  featured_product_ids: message('Featured products'),
};

const CONTROL_SELECTOR =
  'input, textarea, select, [contenteditable="true"], [role="combobox"]';

/**
 * Focuses the control of the given form field: the field group is found by
 * the name its HookForm.Field carries (rendered as data-field-name), then
 * the actual control inside it. Falls back to a bare [name] match so plain
 * inputs work too. Returns false when the field cannot be located.
 */
function focusFieldControl(key: string): boolean {
  const escaped = key.replace(/["\\]/g, '\\$&');
  const scope =
    document.querySelector<HTMLElement>(
      `[data-slot="field"][data-field-name="${escaped}"]`,
    ) ?? document.querySelector<HTMLElement>(`[name="${escaped}"]`);
  if (!scope) return false;
  const control = scope.matches(CONTROL_SELECTOR)
    ? scope
    : scope.querySelector<HTMLElement>(CONTROL_SELECTOR);
  control?.focus();
  return !!control;
}

/**
 * The server rejected the last save: a role=alert summary at the top of the
 * active tab listing every failing field as a link, with focus moved to the
 * first invalid control (falling back to the summary itself when a field has
 * no locatable control — e.g. a 500 with no field errors) (A-07).
 */
export function SaveErrorSummary({
  activeTab,
}: {
  activeTab: 'profile' | 'appearance';
}) {
  const error = useBiolinkEditorStore(s => s.saveError);
  const {trans} = useTrans();
  const containerRef = useRef<HTMLDivElement>(null);

  // Only the tab that owns the failed save shows it (about is part of the
  // profile form, so both share the 'profile' tag).
  const visible: StoreSaveError =
    error && error.tab === activeTab ? error : null;

  useEffect(() => {
    if (!visible) return;
    const fields = Object.keys(visible.parsed.errors ?? {});
    if (fields.some(focusFieldControl)) return;
    containerRef.current?.focus();
    // Fires only when a new error object arrives — never on tab hops.
  }, [visible]);

  if (!visible) return null;

  const entries = Object.entries(visible.parsed.errors ?? {});

  return (
    <div
      ref={containerRef}
      role="alert"
      tabIndex={-1}
      className="mb-6 rounded-border border border-destructive bg-destructive/10 p-4 text-sm outline-none"
    >
      <p className="font-medium">
        <Trans message="Could not save changes" />
      </p>
      {/* Plain foreground, not muted: muted-foreground on the destructive
          tint measures 3.92:1 — below the 4.5:1 WCAG AA floor (axe). */}
      <p className="mt-1">{visible.parsed.message}</p>
      {entries.length > 0 && (
        <ul className="mt-2 list-disc ps-5">
          {entries.map(([key, rawMessages]) => {
            const label = FIELD_LABELS[key]
              ? trans(FIELD_LABELS[key])
              : trans(
                  message(':field', {
                    values: {field: key.replace(/[._-]+/g, ' ')},
                  }),
                );
            const messages = Array.isArray(rawMessages)
              ? rawMessages
              : [rawMessages];
            return (
              <li key={key}>
                <a
                  href={`#${key}`}
                  onClick={event => {
                    event.preventDefault();
                    focusFieldControl(key);
                  }}
                >
                  {label}
                </a>
                {messages.length > 0 && (
                  <span> — {messages.join('. ')}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
