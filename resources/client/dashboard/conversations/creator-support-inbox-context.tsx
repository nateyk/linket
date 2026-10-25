import {createContext, ReactNode, useContext} from 'react';

const CreatorSupportInboxContext = createContext(false);

export function CreatorSupportInboxProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <CreatorSupportInboxContext.Provider value={true}>
      {children}
    </CreatorSupportInboxContext.Provider>
  );
}

export function useCreatorSupportInbox(): boolean {
  return useContext(CreatorSupportInboxContext);
}

export function useSupportInboxBasePath(): string {
  return useCreatorSupportInbox() ? '/dashboard/support' : '/agent';
}
