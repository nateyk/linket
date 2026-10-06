import {Biolink} from '@app/gen/schemas/biolink';
import {Store} from '@app/gen/schemas/store';
import {
  CreatorProfileConfig,
  CreatorProfileSection,
  getCreatorProfileConfig,
} from '@app/dashboard/stores/store-editor/creator-profile-types';
import {ParsedApiError} from '@common/http/errors/parsed-api-error';
import {createContext, ReactNode, use, useState} from 'react';
import {create} from 'zustand';
import {useStoreWithEqualityFn} from 'zustand/traditional';

type StoreBiolink = Biolink | Store;
type Appearance = Required<StoreBiolink>['appearance']['config'];

/**
 * The failure of the last save attempt, tagged with the form it belongs to
 * so the error summary only shows inside that tab (A-07).
 */
export type StoreSaveError = {
  tab: 'profile' | 'appearance';
  parsed: ParsedApiError;
} | null;

interface BiolinkEditorState {
  appearance: Appearance;
  appearanceIsDirty: boolean;
  content: NonNullable<StoreBiolink['content']>;
  profileConfig: CreatorProfileConfig;
  /**
   * The profile config as last loaded from or saved to the server. It lives
   * in the store — not in the editor component — because the editor remounts
   * on every Content -> Appearance -> Content tab switch, and dirtiness
   * (Save's enabled state, the leave-warning) must keep meaning "differs
   * from last saved" across those remounts.
   */
  savedProfileConfig: CreatorProfileConfig;
  profileIsDirty: boolean;
  featuredProductIds: number[];
  /** Open accordion section of the Content tab; drives the preview (A-06). */
  openSection: CreatorProfileSection | null;
  /** Last save failure, cleared when a new save starts (A-07). */
  saveError: StoreSaveError;
  /** 'saved' right after a successful save — announced via role=status. */
  saveStatus: 'saved' | null;
  setAppearanceIsDirty: (isDirty: boolean) => void;
  biolink: Omit<StoreBiolink, 'appearance' | 'content'>;
  updateAppearance: (payload: Appearance) => void;
  updateProfileConfig: (payload: CreatorProfileConfig) => void;
  setProfileIsDirty: (isDirty: boolean) => void;
  /** Save succeeded: the live config is now the saved baseline. */
  markProfileSaved: (config: CreatorProfileConfig) => void;
  /**
   * A pristine form absorbed TipTap's canonical About HTML (A-01/A-02);
   * the saved baseline absorbs it too, or the next remount would read the
   * absorption as an edit.
   */
  rebaseSavedAboutHtml: (aboutHtml: string) => void;
  setFeaturedProductIds: (ids: number[]) => void;
  setOpenSection: (section: CreatorProfileSection | null) => void;
  setSaveError: (error: StoreSaveError) => void;
  setSaveStatus: (status: 'saved' | null) => void;
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

const createBiolinkEditorStore = (biolink: StoreBiolink) => {
  return create<BiolinkEditorState>()((set, get) => ({
    getState: () => get(),
    appearance: {
      ...defaultAppearance,
      ...(biolink.appearance?.config ?? {}),
      layout: 'profile-sidebar',
    },
    appearanceIsDirty: false,
    profileConfig: getCreatorProfileConfig(biolink as any),
    savedProfileConfig: getCreatorProfileConfig(biolink as any),
    profileIsDirty: false,
    featuredProductIds: [],
    // Single-open, all closed on load — the shared section-accordion
    // contract with the Appearance tab (the preview maps anything but
    // products to its profile section, so null stays preview-safe).
    openSection: null,
    saveError: null,
    saveStatus: null,
    setAppearanceIsDirty: (isDirty: boolean) => {
      set(() => ({appearanceIsDirty: isDirty}));
    },
    setProfileIsDirty: (isDirty: boolean) => {
      set(() => ({profileIsDirty: isDirty}));
    },
    markProfileSaved: (config: CreatorProfileConfig) => {
      set(() => ({
        savedProfileConfig: config,
        // The live config is now the saved baseline — both sides, or the
        // mount re-seed would compare values against a stale draft.
        profileConfig: config,
        profileIsDirty: false,
      }));
    },
    rebaseSavedAboutHtml: (aboutHtml: string) => {
      set(state => ({
        savedProfileConfig: {...state.savedProfileConfig, about_html: aboutHtml},
        // The pushed draft absorbs it in the same tick: the form re-seed
        // re-runs whenever the saved baseline changes, and it would
        // otherwise re-apply the pre-canonical draft over the rebased form.
        profileConfig: {...state.profileConfig, about_html: aboutHtml},
      }));
    },
    setFeaturedProductIds: (ids: number[]) => {
      set(() => ({featuredProductIds: ids}));
    },
    setOpenSection: (section: CreatorProfileSection | null) => {
      set(() => ({openSection: section}));
    },
    setSaveError: (error: StoreSaveError) => {
      set(() => ({saveError: error}));
    },
    setSaveStatus: (status: 'saved' | null) => {
      set(() => ({saveStatus: status}));
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
      // Only stores the payload. Dirtiness is owned by setProfileIsDirty,
      // because the form sync pushes on every change — including pushes
      // that carry a clean, reverted form back to the preview (A-05).
      set(() => ({
        profileConfig: payload,
      }));
    },
  }));
};

type BiolinkEditorStore = ReturnType<typeof createBiolinkEditorStore>;
const BiolinkEditorStoreContext = createContext<BiolinkEditorStore>(
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
