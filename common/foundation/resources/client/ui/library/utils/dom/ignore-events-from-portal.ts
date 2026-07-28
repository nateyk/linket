import {EventHandler, SyntheticEvent} from 'react';

export function ignoreEventsFromPortal(handler?: EventHandler<SyntheticEvent>) {
  if (!handler) return handler;

  return (e: SyntheticEvent) => {
    // ignore events bubbling up from portals
    if (e.currentTarget.contains(e.target as HTMLElement)) {
      handler(e);
    }
  };
}
