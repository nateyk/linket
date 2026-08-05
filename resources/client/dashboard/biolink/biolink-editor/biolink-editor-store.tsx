import {Biolink} from '@app/gen/schemas/biolink';
import {
  CreatorProfileConfig,
  getCreatorProfileConfig,
} from '@app/dashboard/biolink/biolink-editor/creator-profile-types';
import {createContext, ReactNode, use, useState} from 'react';
import {create} from 'zustand';
import {useStoreWithEqualityFn} from 'zustand/traditional';

type Appearance = Required<Biolink>['appearance']['config'];

interface BiolinkEditorState {
  appearance: Appearance;
  appearanceIsDirty: boolean;
  content: NonNullable<Biolink['content']>;
  profileConfig: CreatorProfileConfig;
  profileIsDirty: boolean;
  setAppearanceIsDirty: (isDirty: boolean) => void;
  biolink: Omit<Biolink, 'appearance' | 'content'>;
  updateAppearance: (payload: Appearance) => void;
  updateProfileConfig: (payload: CreatorProfileConfig) => void;
  setProfileIsDirty: (isDirty: boolean) => void;
  overrideContent: (content: Biolink['content']) => void;
  getState: () => BiolinkEditorState;
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

export const createBiolinkEditorStore = (biolink: Biolink) => {
  return create<BiolinkEditorState>()((set, get) => ({
    getState: () => get(),
    appearance: {
      ...defaultAppearance,
      ...(biolink.appearance?.config ?? {}),
      layout: 'profile-sidebar',
    },
    appearanceIsDirty: false,
    profileConfig: getCreatorProfileConfig(biolink),
    profileIsDirty: false,
    setAppearanceIsDirty: (isDirty: boolean) => {
      set(() => ({appearanceIsDirty: isDirty}));
    },
    setProfileIsDirty: (isDirty: boolean) => {
      set(() => ({profileIsDirty: isDirty}));
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

// export const useBiolinkEditorStore = create<BiolinkEditorState>()(
//   immer((set, get) => ({
//     appearance: defaultAppearance,
//     appearanceIsDirty: false,
//     setAppearanceIsDirty: (isDirty: boolean) => {
//       set(state => {
//         state.appearanceIsDirty = isDirty;
//       });
//     },
//     biolink: null,
//     setBiolink: biolink => {
//       set(state => {
//         state.biolink = biolink;
//         // don't override user appearance changes in the editor when biolink reloads from backend
//         if (!state.appearanceIsDirty) {
//           state.appearance = biolink.appearance?.config || defaultAppearance;
//         }
//       });
//     },
//     updateAppearance(payload: BiolinkAppearance) {
//       set(state => {
//         state.appearanceIsDirty = true;
//         state.appearance = {
//           ...state.appearance,
//           ...payload,
//         };
//       });
//     },
//   })),
// );

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
  data: Biolink;
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
