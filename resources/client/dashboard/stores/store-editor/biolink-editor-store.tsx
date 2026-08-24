import {Biolink} from '@app/gen/schemas/biolink';
import {Store} from '@app/gen/schemas/store';
import {
  CreatorProfileConfig,
  getCreatorProfileConfig,
} from '@app/dashboard/stores/store-editor/creator-profile-types';
import {createContext, ReactNode, use, useState} from 'react';
import {create} from 'zustand';
import {useStoreWithEqualityFn} from 'zustand/traditional';

type StoreBiolink = Biolink | Store;
type Appearance = Required<StoreBiolink>['appearance']['config'];

interface BiolinkEditorState {
  appearance: Appearance;
  appearanceIsDirty: boolean;
  content: NonNullable<StoreBiolink['content']>;
  profileConfig: CreatorProfileConfig;
  profileIsDirty: boolean;
  featuredProductIds: number[];
  setAppearanceIsDirty: (isDirty: boolean) => void;
  biolink: Omit<StoreBiolink, 'appearance' | 'content'>;
  updateAppearance: (payload: Appearance) => void;
  updateProfileConfig: (payload: CreatorProfileConfig) => void;
  setProfileIsDirty: (isDirty: boolean) => void;
  setFeaturedProductIds: (ids: number[]) => void;
  overrideContent: (content: StoreBiolink['content']) => void;
  getState: () => BiolinkEditorState;
  hasUnsavedChanges: () => boolean;
}

const defaultAppearance: Appearance = {
  bgConfig: {
    backgroundColor: '',
    color: '',
  },
  btnConfig: {
    variant: 'solid',
    radius: 'rounded-sm',
    shadow: 'none',
  },
  layout: 'profile-sidebar',
};

export const createBiolinkEditorStore = (biolink: StoreBiolink) => {
  return create<BiolinkEditorState>()((set, get) => ({
    getState: () => get(),
    appearance: {
      ...defaultAppearance,
      ...(biolink.appearance?.config ?? {}),
      layout: 'profile-sidebar',
    },
    appearanceIsDirty: false,
    profileConfig: getCreatorProfileConfig(biolink as any),
    profileIsDirty: false,
    featuredProductIds: [],
    setAppearanceIsDirty: (isDirty: boolean) => {
      set(() => ({appearanceIsDirty: isDirty}));
    },
    setProfileIsDirty: (isDirty: boolean) => {
      set(() => ({profileIsDirty: isDirty}));
    },
    setFeaturedProductIds: (ids: number[]) => {
      set(() => ({featuredProductIds: ids}));
    },
    biolink: {
      ...biolink,
      appearance: null,
      content: null,
    },
    content: biolink.content ?? [],
    overrideContent: content => {
      set(() => ({content}));
    },
    hasUnsavedChanges: () => {
      const state = get();
      return state.appearanceIsDirty || state.profileIsDirty;
    },
    updateAppearance(payload: Appearance) {
      set(state => ({
        appearanceIsDirty: true,
        appearance: {
          ...state.appearance,
          ...payload,
        },
      }));
    },
    updateProfileConfig(payload: CreatorProfileConfig) {
      set(() => ({
        profileConfig: payload,
        profileIsDirty: true,
      }));
    },
  }));
};

type BiolinkEditorStore = ReturnType<typeof createBiolinkEditorStore>;
export const BiolinkEditorStoreContext = createContext<BiolinkEditorStore>(
  null!,
);

export function useBiolinkEditorStore<T>(
  selector: (s: BiolinkEditorState) => T,
  equalityFn?: (left: T, right: T) => boolean,
): T {
  const store = use(BiolinkEditorStoreContext);
  return useStoreWithEqualityFn(store, selector, equalityFn);
}

export interface BiolinkEditorStoreProviderProps {
  children: ReactNode;
  data: StoreBiolink;
}
export function BiolinkEditorStoreProvider({
  children,
  data,
}: BiolinkEditorStoreProviderProps) {
  //lazily create store object only once
  const [store] = useState(() => {
    return createBiolinkEditorStore(data);
  });

  return (
    <BiolinkEditorStoreContext.Provider value={store}>
      {children}
    </BiolinkEditorStoreContext.Provider>
  );
}
