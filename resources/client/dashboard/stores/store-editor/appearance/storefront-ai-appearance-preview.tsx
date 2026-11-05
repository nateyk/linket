import {useBiolinkEditorStore} from '@app/dashboard/stores/store-editor/biolink-editor-store';
import {apiClient} from '@common/http/query-client';
import {Button} from '@shadcn/button/button';
import {Trans} from '@ui/i18n/trans';
import {useEffect, useRef, useState} from 'react';

type Preset = 'calm' | 'clear' | 'profile';
interface Preview {
  store_id: number;
  preset: Preset;
  source_fingerprint: string;
  changes: {
    btnConfig?: {
      variant?: 'outline' | 'solid';
      radius?: 'rounded-sm' | 'rounded-lg';
      shadow?: 'none';
    };
  };
  read_only: true;
  requires_review: true;
}

const PRESETS: Array<{id: Preset; label: string}> = [
  {id: 'calm', label: 'Calm'},
  {id: 'clear', label: 'Clear'},
  {id: 'profile', label: 'Profile'},
];

/**
 * PR-09 milestone 1: observational preview only.
 * Intentionally no apply/save/publish button until the normal storefront
 * mutation endpoint supports an atomic server-side revision check.
 */
export function StorefrontAiAppearancePreview() {
  const storeId = useBiolinkEditorStore(s => s.biolink.id);
  const appearanceIsDirty = useBiolinkEditorStore(s => s.appearanceIsDirty);
  const currentButtons = useBiolinkEditorStore(s => s.appearance?.btnConfig);
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [preview, setPreview] = useState<Preview>();
  const requestVersion = useRef(0);
  const base = '/api/v1/creator-ai/stores/' + storeId;

  useEffect(() => {
    const version = ++requestVersion.current;
    let active = true;
    setAvailable(false);
    setPreview(undefined);
    void apiClient.get(base + '/appearance-availability')
      .then(r => {
        if (active && version === requestVersion.current) setAvailable(r.data?.data?.available === true);
      })
      .catch(() => {
        if (active && version === requestVersion.current) setAvailable(false);
      });
    return () => { active = false; requestVersion.current++; };
  }, [base]);

  useEffect(() => {
    if (appearanceIsDirty) {
      requestVersion.current++;
      setPreview(undefined);
    }
  }, [appearanceIsDirty]);

  if (!available) return null;

  async function requestPreview(preset: Preset) {
    if (loading || appearanceIsDirty) return;
    setError(undefined);
    setPreview(undefined);
    setLoading(true);
    const version = ++requestVersion.current;
    try {
      const r = await apiClient.get(base + '/appearance-preview', {
        params: {preset},
      });
      if (version === requestVersion.current) setPreview(r.data.data as Preview);
    } catch (err) {
      const status = (err as {response?: {status?: number}})?.response?.status;
      if (version !== requestVersion.current) return;
      setError(status === 409
        ? 'The storefront has changed. Refresh before previewing.'
        : status === 403
          ? 'This preview requires an active verified Linket Pro plan.'
          : 'Could not load the appearance preview. Your storefront is unchanged.');
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }

  return (
    <section className="space-y-3 border-b border-border pb-4" aria-label="Storefront appearance suggestions">
      <div>
        <h3 className="text-sm font-medium"><Trans message="Appearance ideas" /></h3>
        <p className="mt-1 text-xs text-muted-foreground">
          <Trans message="Compare safe Linket style presets. Preview only — no changes are saved." />
        </p>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Preview style">
        {PRESETS.map(item => (
          <Button
            key={item.id}
            type="button"
            size="sm"
            variant="outline"
            disabled={loading || appearanceIsDirty}
            aria-pressed={preview?.preset === item.id}
            onClick={() => void requestPreview(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>
      {appearanceIsDirty && (
        <p className="text-xs text-muted-foreground" role="status">
          <Trans message="Save or discard your unsaved appearance edits before requesting a new preview." />
        </p>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {loading && <p role="status" className="text-xs text-muted-foreground">
        <Trans message="Loading preview…" />
      </p>}
      {preview && !appearanceIsDirty && (
        <div className="space-y-2 rounded-card-xs border border-border bg-muted/20 p-3" aria-live="polite">
          <p className="text-xs font-medium">
            <Trans message="Proposed differences — not applied" />
          </p>
          {Object.keys(preview.changes).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              <Trans message="Your appearance already matches this preset." />
            </p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                <Trans message="Illustrative button comparison only. Existing storefront colors, content, layout and branding remain untouched." />
              </p>
              <div className="grid gap-3 sm:grid-cols-2" aria-label="Before and after comparison">
                {(['before', 'after'] as const).map(which => {
                  const variant = which === 'before'
                    ? currentButtons?.variant ?? 'solid'
                    : preview.changes.btnConfig?.variant ?? currentButtons?.variant ?? 'solid';
                  const radius = which === 'before'
                    ? currentButtons?.radius ?? 'rounded-sm'
                    : preview.changes.btnConfig?.radius ?? currentButtons?.radius ?? 'rounded-sm';
                  return (
                    <div key={which} className="space-y-2 rounded-card-xs border border-border bg-background p-3">
                      <p className="text-xs font-medium">
                        {which === 'before' ? <Trans message="Current" /> : <Trans message="Suggested" />}
                      </p>
                      <div className="flex min-h-14 items-center justify-center">
                        <span className={[
                          'inline-flex min-h-9 items-center justify-center border border-primary px-4 py-2 text-xs font-medium',
                          radius === 'rounded-none' ? 'rounded-none' : radius === 'rounded-lg' ? 'rounded-button' : 'rounded-input',
                          variant === 'outline' ? 'bg-transparent text-primary' : 'bg-primary text-primary-foreground',
                        ].join(' ')}>
                          <Trans message="Sample action" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                {Object.entries(preview.changes.btnConfig ?? {}).map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-xs text-muted-foreground">{key}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
          <Button size="sm" variant="ghost" type="button" onClick={() => setPreview(undefined)}>
            <Trans message="Dismiss preview" />
          </Button>
        </div>
      )}
    </section>
  );
}
