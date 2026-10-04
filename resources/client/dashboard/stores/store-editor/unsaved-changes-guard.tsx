import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Trans} from '@ui/i18n/trans';
import {useEffect, useState} from 'react';
import {useBlocker} from 'react-router';

/**
 * True for the store editor's own routes: its base path plus the Content /
 * About / Appearance / Insights tabs. A naive `startsWith` would also match
 * `/stores/10` for base `/stores/1`, so the boundary is exact.
 */
export function isWithinStoreEditorPath(
  baseUrl: string,
  pathname: string,
): boolean {
  return pathname === baseUrl || pathname.startsWith(`${baseUrl}/`);
}

export interface UnsavedChangesGuardProps {
  /** Either form (profile or appearance) has unsaved edits. */
  isDirty: boolean;
  /** In-editor navigation (tab switches) must never be blocked. */
  isEditorPath: (pathname: string) => boolean;
  /** Persist every dirty part; resolves on success, rejects on failure. */
  saveAndLeave: () => Promise<void>;
}

/**
 * Keeps unsaved editor changes from vanishing silently (A-02):
 * - `beforeunload` covers reload / tab close (the browser allows only its
 *   generic prompt here);
 * - a router blocker covers in-app navigation and, while it holds the
 *   navigation open, offers an accessible Save & leave / Discard / Stay
 *   dialog instead of a yes/no guess.
 */
export function UnsavedChangesGuard({
  isDirty,
  isEditorPath,
  saveAndLeave,
}: UnsavedChangesGuardProps) {
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Legacy browsers ignore preventDefault without returnValue.
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);

  const blocker = useBlocker(
    ({nextLocation}) => isDirty && !isEditorPath(nextLocation.pathname),
  );
  const blocked = blocker.state === 'blocked';

  const stay = () => {
    if (blocker.state === 'blocked') blocker.reset();
  };
  const leave = () => {
    if (blocker.state === 'blocked') blocker.proceed();
  };
  const saveThenLeave = async () => {
    setIsSaving(true);
    try {
      await saveAndLeave();
      leave();
    } catch {
      // The save mutations already toast the error; keep the user here.
      stay();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog.Root open={blocked} onOpenChange={open => !open && stay()}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>
              <Trans message="You have unsaved changes" />
            </Dialog.Title>
            <Dialog.Description>
              <Trans message="Save them before you go, or discard them. Staying keeps editing." />
            </Dialog.Description>
          </Dialog.Header>
          <Dialog.Footer>
            <Button variant="ghost" onClick={stay}>
              <Trans message="Stay" />
            </Button>
            <Button variant="outline" onClick={leave}>
              <Trans message="Discard" />
            </Button>
            <Button onClick={saveThenLeave} disabled={isSaving}>
              <Trans message="Save & leave" />
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
