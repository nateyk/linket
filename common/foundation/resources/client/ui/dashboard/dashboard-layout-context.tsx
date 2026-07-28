import {
  getFromLocalStorage,
  setInLocalStorage,
} from '@ui/utils/hooks/local-storage';
import {useMediaQuery} from '@ui/utils/hooks/use-media-query';
import {createContext, ReactNode, useCallback, useMemo, useState} from 'react';

export type DashboardSidebarStatus = 'collapsed' | 'expanded';
export type DashboardSectionVariant = 'floating' | 'inset' | 'default';

type SidebarState = {
  status: DashboardSidebarStatus;
  setStatus: (status: DashboardSidebarStatus) => void;
  toggleStatus: () => void;
};

export type DashboardLayoutContextValue = {
  name: string;
  isMobileMode: boolean | null;
  leftSidebar: SidebarState;
  rightSidebar: SidebarState;
  defaultSectionVariant: DashboardSectionVariant;
};

export const DashboardLayoutContext =
  createContext<DashboardLayoutContextValue>(null!);

type ProviderProps = {
  name: string;
  defaultLeftSidebarStatus?: DashboardSidebarStatus;
  defaultRightSidebarStatus?: DashboardSidebarStatus;
  defaultSectionVariant?: DashboardSectionVariant;
  children: (value: DashboardLayoutContextValue) => ReactNode;
};

export function DashboardLayoutContextProvider({
  children,
  name,
  defaultLeftSidebarStatus,
  defaultRightSidebarStatus,
  defaultSectionVariant = 'floating',
}: ProviderProps) {
  const isMobileMode = useIsMobileMode();
  const leftSidebar = useSidebarStatus(name, 'left', defaultLeftSidebarStatus);
  const rightSidebar = useSidebarStatus(
    name,
    'right',
    defaultRightSidebarStatus,
  );

  const value = useMemo(
    () => ({
      name,
      isMobileMode,
      leftSidebar,
      rightSidebar,
      defaultSectionVariant,
    }),
    [name, isMobileMode, leftSidebar, rightSidebar, defaultSectionVariant],
  );

  return (
    <DashboardLayoutContext.Provider value={value}>
      {children(value)}
    </DashboardLayoutContext.Provider>
  );
}

function useSidebarStatus(
  layoutName: string,
  sidebarName: string,
  defaultStatus?: DashboardSidebarStatus,
) {
  const isMobileMode = useIsMobileMode();
  const [desktopStatus, _setDesktopStatus] = useState(() => {
    const userSelected = getFromLocalStorage<DashboardSidebarStatus>(
      `${layoutName}.sidebar.${sidebarName}.desktop.status`,
    );

    if (userSelected != null) {
      return userSelected;
    }

    return defaultStatus ?? 'expanded';
  });

  const setDesktopStatus = useCallback(
    (status: DashboardSidebarStatus) => {
      _setDesktopStatus(status);
      setInLocalStorage(
        `${layoutName}.sidebar.${sidebarName}.desktop.status`,
        status,
      );
    },
    [_setDesktopStatus, layoutName, sidebarName],
  );

  const [mobileStatus, setMobileStatus] =
    useState<DashboardSidebarStatus>('collapsed');

  const status = isMobileMode ? mobileStatus : desktopStatus;
  const setStatus = isMobileMode ? setMobileStatus : setDesktopStatus;

  const toggleStatus = useCallback(() => {
    setStatus(status === 'collapsed' ? 'expanded' : 'collapsed');
  }, [status, setStatus]);

  return useMemo(
    () => ({
      status,
      setStatus,
      toggleStatus,
    }),
    [status, setStatus, toggleStatus],
  );
}

function useIsMobileMode(): boolean {
  return useMediaQuery('(max-width: 1024px)') ?? false;
}
