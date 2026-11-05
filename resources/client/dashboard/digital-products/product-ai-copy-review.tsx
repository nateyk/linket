import {apiClient} from '@common/http/query-client';
import {Button} from '@shadcn/button/button';
import {Trans} from '@ui/i18n/trans';
import {SparklesIcon, XIcon} from 'lucide-react';
import {useEffect, useState} from 'react';
import {canUseProductCopyDraft, type ProductCopyDraft} from './product-ai-copy-review-state';

interface Props {
  productId: number;
  currentTitle: string;
  currentDescription: string;
  onUseDescription: (description: string) => void;
}

/** Review-only component: no direct product save or publish requests. */
export function ProductAiCopyReview({
  productId,
  currentTitle,
  currentDescription,
  onUseDescription,
}: Props) {
  const [available, setAvailable] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [draft, setDraft] = useState<ProductCopyDraft>();
  const [text, setText] = useState('');
  const base = '/api/v1/creator-ai/products/' + productId;

  useEffect(() => {
    let active = true;
    setChecking(true);
    setAvailable(false);
    setDraft(undefined);
    setError(undefined);
    void apiClient
      .get(base + '/copy-availability')
      .then(response => {
        if (active) setAvailable(response.data?.data?.available === true);
      })
      .catch(() => {
        if (active) setAvailable(false);
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, [base]);

  if (checking || !available) return null;

  async function generate() {
    if (busy) return;
    setBusy(true);
    setError(undefined);
    setDraft(undefined);
    try {
      const response = await apiClient.post(base + '/copy-proposals', {
        tone: 'clear',
        language: 'en',
      });
      const result = response.data.data as {
        title: string;
        description: string;
        source_fingerprint: string;
      };
      const candidate: ProductCopyDraft = {
        ...result,
        local_title: currentTitle,
        local_description: currentDescription,
      };
      setDraft(candidate);
      setText(candidate.description);
    } catch {
      setError('Could not generate a suggestion. No product changes were made.');
    } finally {
      setBusy(false);
    }
  }

  async function useDescription() {
    if (!draft || busy) return;
    if (!canUseProductCopyDraft(draft, currentTitle, currentDescription, text)) {
      setError('The product or suggested text changed. Please generate another suggestion.');
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      await apiClient.post(base + '/copy-revision', {
        source_fingerprint: draft.source_fingerprint,
      });
      onUseDescription(text.trim());
      setDraft(undefined);
      setText('');
    } catch {
      setError('The product may have changed. Refresh before using this suggestion.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="space-y-3 rounded-card-sm border border-border bg-muted/20 p-3 sm:p-4"
      aria-label="AI copy suggestions"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium"><Trans message="AI writing assistant" /></p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            <Trans message="Review and edit a private suggestion before using it." />
          </p>
        </div>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => void generate()}>
          <SparklesIcon className="size-4" aria-hidden="true" />
          <Trans message={busy ? 'Working…' : 'Suggest copy'} />
        </Button>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {draft && (
        <div className="space-y-3 border-t border-border pt-3" aria-live="polite">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              <Trans message="Suggested title (preview only)" />
            </p>
            <p className="mt-1 text-sm">{draft.title}</p>
          </div>
          <div className="space-y-1">
            <label htmlFor="product-ai-suggestion" className="text-xs font-medium">
              <Trans message="Suggested description — edit before use" />
            </label>
            <textarea
              id="product-ai-suggestion"
              className="min-h-32 w-full resize-y rounded-input border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
              value={text}
              maxLength={5000}
              onChange={event => setText(event.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            <Trans message="AI may make mistakes. Review all claims. Saving and moderation still use the normal product editor." />
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={busy || !text.trim()} onClick={() => void useDescription()}>
              <Trans message="Use description" />
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => {
              setDraft(undefined);
              setText('');
              setError(undefined);
            }}>
              <XIcon className="size-4" aria-hidden="true" />
              <Trans message="Discard" />
            </Button>
          </div>
        </div>
      )}
      {busy && <p role="status" className="text-xs text-muted-foreground">
        <Trans message="Checking your request…" />
      </p>}
    </section>
  );
}
