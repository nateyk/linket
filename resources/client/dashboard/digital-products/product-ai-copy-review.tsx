import {apiClient} from '@common/http/query-client';
import {Button} from '@shadcn/button/button';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {Trans} from '@ui/i18n/trans';
import {message} from '@ui/i18n/message';
import {MessageDescriptor} from '@ui/i18n/message-descriptor';
import {SparklesIcon, XIcon} from 'lucide-react';
import {useEffect, useId, useRef, useState} from 'react';
import {
  canUseProductCopyDraft,
  type ProductCopyDraft,
  type CopyDraftIdentity,
} from './product-ai-copy-review-state';

interface Props {
  productId: number;
  currentTitle: string;
  currentDescription: string;
  onUseDescription: (
    description: string,
    sourceFingerprint: string,
    draft?: CopyDraftIdentity,
  ) => void;
}

function copyError(
  reason: unknown,
  action: 'generate' | 'apply',
): MessageDescriptor {
  const status = (reason as {response?: {status?: number}})?.response?.status;
  if (status === 429)
    return message(
      'Your AI generation quota or the provider budget is exhausted. Try again after the limit resets.',
    );
  if (status === 403)
    return message('AI writing is unavailable for your account or product.');
  if (status === 409)
    return message(
      'This product or draft changed. Your text is preserved. Save the private draft, copy any text you want to keep, then refresh and generate a new suggestion.',
    );
  if (status === 422)
    return message('Could not save this suggestion. Use plain text without links or unverified claims. Your edits are preserved.');
  if (status === 503)
    return message(
      'AI writing is temporarily unavailable. Usage may be held for billing reconciliation.',
    );
  return action === 'generate'
    ? message('Could not generate a suggestion. No product changes were made.')
    : message(
        'Could not verify the latest product revision. Your description was not changed.',
      );
}

/** The creator explicitly applies copy to their local form, never to the backend. */
export function ProductAiCopyReview({
  productId,
  currentTitle,
  currentDescription,
  onUseDescription,
}: Props) {
  const [available, setAvailable] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<MessageDescriptor>();
  const [notice, setNotice] = useState<MessageDescriptor>();
  const [draft, setDraft] = useState<ProductCopyDraft>();
  const [text, setText] = useState('');
  const latestSource = useRef({
    productId,
    title: currentTitle,
    description: currentDescription,
  });
  latestSource.current = {
    productId,
    title: currentTitle,
    description: currentDescription,
  };
  const latestText = useRef(text);
  latestText.current = text;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const requestsRef = useRef({version: 0, inFlight: false});
  const requests = requestsRef.current;
  const sectionId = useId();
  const titleId = sectionId + '-title';
  const suggestionId = sectionId + '-suggestion';
  const hintId = sectionId + '-hint';
  const base = '/api/v1/creator-ai/products/' + productId;
  const isCurrentRequest = (version: number) =>
    version === requests.version &&
    latestSource.current.productId === productId;

  useEffect(() => {
    ++requests.version;
    requests.inFlight = false;
    let active = true;
    setChecking(true);
    setAvailable(false);
    setDraft(undefined);
    setText('');
    setBusy(false);
    setError(undefined);
    setNotice(undefined);
    void apiClient
      .get(base + '/copy-availability')
      .then(async response => {
        if (!active) return;
        const enabled = response.data?.data?.available === true;
        setAvailable(enabled);
        if (enabled) {
          await apiClient
            .get(base + '/copy-drafts')
            .then(saved => {
              const result = saved.data?.data as ProductCopyDraft;
              if (active && result?.draft_id) {
                setDraft({
                  ...result,
                  local_title: latestSource.current.title,
                  local_description: latestSource.current.description,
                });
                setText(result.description);
                setNotice(
                  message('Private draft reopened. Review it before applying.'),
                );
              }
            })
            .catch(() => {
              if (active)
                setError(
                  message(
                    'Could not reopen your private draft. Refresh to try again.',
                  ),
                );
            });
        }
      })
      .catch(() => {
        if (active) setAvailable(false);
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
      ++requests.version;
      requests.inFlight = false;
    };
  }, [base, requests]);

  const draftFocusKey = draft?.draft_id ?? draft?.source_fingerprint;
  useEffect(() => {
    if (draftFocusKey && !checking) document.getElementById(suggestionId)?.focus();
  }, [draftFocusKey, suggestionId, checking]);

  useEffect(() => {
    if (!notice || busy || draft) return;
    // Apply removes its button. A second click in the same double-click can
    // then land on the document and steal focus. Restore the trigger after that.
    const focusTrigger = () => triggerRef.current?.focus();
    focusTrigger();
    const timer = window.setTimeout(focusTrigger, 0);
    return () => window.clearTimeout(timer);
  }, [notice, busy, draft]);

  const saveReviewRef = useRef(saveReview);
  saveReviewRef.current = saveReview;
  useEffect(() => {
    if (!draft?.draft_id || text === draft.description || busy || error) return;
    const timer = window.setTimeout(() => void saveReviewRef.current(), 800);
    return () => window.clearTimeout(timer);
  }, [text, draft, busy, error]);

  useEffect(() => {
    if (!draft?.draft_id || (text === draft.description && !busy)) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [text, draft, busy]);

  async function saveReview() {
    if (!draft?.draft_id || requests.inFlight) return;
    requests.inFlight = true;
    const version = ++requests.version;
    setBusy(true);
    setError(undefined);
    try {
      const response = await apiClient.patch(
        base + '/copy-drafts/' + draft.draft_id,
        {
          version: draft.draft_version,
          description: text,
        },
      );
      if (!isCurrentRequest(version)) return;
      setDraft({...draft, ...response.data.data});
      if (latestText.current === text) setText(response.data.data.description);
      setNotice(
        message('Private review saved. Product content has not changed.'),
      );
    } catch (reason) {
      if (isCurrentRequest(version)) setError(copyError(reason, 'apply'));
    } finally {
      if (isCurrentRequest(version)) {
        requests.inFlight = false;
        setBusy(false);
      }
    }
  }

  if (checking || !available) return null;

  async function generate() {
    if (requests.inFlight) return;
    requests.inFlight = true;
    const version = ++requests.version;
    setBusy(true);
    setError(undefined);
    setNotice(undefined);
    setDraft(undefined);
    try {
      const response = await apiClient.post(base + '/copy-proposals', {
        tone: 'clear',
        language: 'en',
      });
      if (!isCurrentRequest(version)) return;
      if (
        latestSource.current.title !== currentTitle ||
        latestSource.current.description !== currentDescription
      ) {
        setError(
          message(
            'The product was edited during generation. Generate another suggestion.',
          ),
        );
        return;
      }
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
    } catch (reason) {
      if (isCurrentRequest(version)) setError(copyError(reason, 'generate'));
    } finally {
      if (isCurrentRequest(version)) {
        requests.inFlight = false;
        setBusy(false);
      }
    }
  }

  async function applyDescription() {
    if (!draft || requests.inFlight) return;
    if (
      !canUseProductCopyDraft(draft, currentTitle, currentDescription, text)
    ) {
      setError(
        message(
          'The product or suggested text changed. Generate another suggestion.',
        ),
      );
      return;
    }
    setBusy(true);
    requests.inFlight = true;
    const version = ++requests.version;
    const approvedText = text;
    setError(undefined);
    setNotice(undefined);
    try {
      let reviewed = draft;
      if (draft.draft_id) {
        const response = await apiClient.patch(
          base + '/copy-drafts/' + draft.draft_id,
          {
            version: draft.draft_version,
            description: approvedText,
          },
        );
        reviewed = {...draft, ...response.data.data};
        if (!isCurrentRequest(version)) return;
        setDraft(reviewed);
        if (reviewed.state !== 'reviewed') {
          setError(
            message(
              'This private draft is expired or based on an older product. Your text is saved. Copy any text you want to keep, then refresh and generate a new suggestion.',
            ),
          );
          return;
        }
      }
      await apiClient.post(base + '/copy-revision', {
        source_fingerprint: draft.source_fingerprint,
      });
      if (!isCurrentRequest(version)) return;
      // A creator may edit the form while revision verification is in flight.
      if (
        latestText.current !== approvedText ||
        !canUseProductCopyDraft(
          draft,
          latestSource.current.title,
          latestSource.current.description,
          text,
        )
      ) {
        setError(
          message(
            'The product or suggested text was edited during verification. Review it and try again.',
          ),
        );
        return;
      }
      onUseDescription(
        (reviewed.draft_id ? reviewed.description : text).trim(),
        draft.source_fingerprint,
        reviewed.draft_id
          ? {
              draftId: reviewed.draft_id,
              draftVersion: reviewed.draft_version!,
            }
          : undefined,
      );
      setDraft(undefined);
      setText('');
      setNotice(
        message(
          'Approved description added to the editor. Await the product Saved confirmation; failed saves leave your private draft available.',
        ),
      );
      triggerRef.current?.focus();
    } catch (reason) {
      if (isCurrentRequest(version)) setError(copyError(reason, 'apply'));
    } finally {
      if (isCurrentRequest(version)) {
        requests.inFlight = false;
        setBusy(false);
      }
    }
  }

  async function discard() {
    if (draft?.draft_id) {
      if (requests.inFlight) return;
      requests.inFlight = true;
      const version = ++requests.version;
      setBusy(true);
      try {
        await apiClient.post(
          base + '/copy-drafts/' + draft.draft_id + '/discard',
          {version: draft.draft_version},
        );
        if (!isCurrentRequest(version)) return;
      } catch (reason) {
        if (isCurrentRequest(version)) setError(copyError(reason, 'apply'));
        return;
      } finally {
        if (isCurrentRequest(version)) {
          requests.inFlight = false;
          setBusy(false);
        }
      }
    }
    ++requests.version;
    requests.inFlight = false;
    setBusy(false);
    setDraft(undefined);
    setText('');
    setError(undefined);
    setNotice(
      message(
        'Suggestion discarded. Your description was not changed. Usage may remain held for billing reconciliation.',
      ),
    );
    triggerRef.current?.focus();
  }

  return (
    <section
      className="flex min-w-0 flex-col gap-3 rounded-card-sm border border-border bg-muted/20 p-3 sm:p-4"
      aria-labelledby={titleId}
      aria-busy={busy}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 id={titleId} className="text-sm font-medium">
            <Trans message="AI writing assistant" />
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            <Trans message="Review and edit a private suggestion before using it." />
          </p>
        </div>
        <Button
          className="h-auto min-h-9 max-w-full whitespace-normal"
          ref={triggerRef}
          size="sm"
          variant="outline"
          disabled={busy || !!draft}
          onClick={() => void generate()}
        >
          <SparklesIcon className="size-4" aria-hidden="true" />
          {busy ? (
            <Trans message="Working…" />
          ) : (
            <Trans message="Suggest copy" />
          )}
        </Button>
        {busy && !draft && (
          <Button size="sm" variant="outline" onClick={discard}>
            <Trans message="Cancel request" />
          </Button>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          <Trans {...error} />
        </p>
      )}
      {notice && !busy && (
        <p
          role="status"
          aria-live="polite"
          className="text-xs text-muted-foreground"
        >
          <Trans {...notice} />
        </p>
      )}

      {draft && (
        <div className="flex flex-col gap-3 border-t border-border pt-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              <Trans message="Suggested title (preview only)" />
            </p>
            <p className="mt-1 text-sm">{draft.title}</p>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={suggestionId} className="text-xs font-medium">
              <Trans message="Suggested description — edit before use" />
            </label>
            <Textarea
              id={suggestionId}
              bindToHookForm={false}
              className="min-h-32 min-w-0 resize-y bg-background text-sm"
              value={text}
              maxLength={5000}
              aria-describedby={hintId}
              onBlur={event => {
                if (!event.currentTarget.closest('section')?.contains(event.relatedTarget) && text !== draft.description) {
                  void saveReview();
                }
              }}
              onChange={event => {
                setText(event.target.value);
                setError(undefined);
              }}
              onKeyDown={event => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  discard();
                }
              }}
            />
          </div>
          <p id={hintId} className="text-xs text-muted-foreground">
            <Trans message="AI may make mistakes. Review factual claims. Saving and moderation still use the normal product editor. Press Escape to discard." />
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={busy || !text.trim()}
              onClick={() => void applyDescription()}
            >
              <Trans message="Apply" />
            </Button>
            {draft.draft_id && (
              <Button
                size="sm"
                variant="outline"
                disabled={busy || !text.trim()}
                className="h-auto min-h-9 max-w-full whitespace-normal"
                onClick={() => void saveReview()}
              >
                <Trans message="Save private draft" />
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => void discard()}
            >
              <XIcon className="size-4" aria-hidden="true" />
              <Trans message="Discard" />
            </Button>
          </div>
        </div>
      )}
      {busy && (
        <p
          role="status"
          aria-live="polite"
          className="text-xs text-muted-foreground"
        >
          <Trans message="Checking your request…" />
        </p>
      )}
    </section>
  );
}
