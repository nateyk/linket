// resources/client/dashboard/digital-products/product-creation-context.tsx
import {
  useRef,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import debounce from 'just-debounce-it';
import type {BillingMode, WizardPrefill} from './product-create-flow';
import type {ProductType} from './product-type-picker';

export interface FileEntry {
  id: number;
  name: string;
  file_size?: number;
  extension?: string;
}

export interface ProductSampleDraft {
  fileEntryId: number;
  name: string;
  fileSize?: number;
  extension?: string;
  title: string;
  durationMs: number | null;
}

export interface ProductFormState {
  title: string;
  description: string;
  price: string;
  coverUrl: string;
  coverFileId: number | null;
  files: FileEntry[];
  samples: ProductSampleDraft[];
  biolinkIds: number[];
  productType: ProductType;
}

export function sampleRequestPayload(samples: ProductSampleDraft[]) {
  return {
    sample_file_ids: samples.map(sample => sample.fileEntryId),
    sample_titles: Object.fromEntries(
      samples.map(sample => [sample.fileEntryId, sample.title]),
    ),
    sample_durations: Object.fromEntries(
      samples.map(sample => [sample.fileEntryId, sample.durationMs]),
    ),
  };
}

export type AutoSaveState = 'idle' | 'saving' | 'saved' | 'failed' | 'conflict';

type ApprovedAiCopy = {productId: number; sourceFingerprint: string};

export interface ProductCreationActions {
  approveAiDescription: (
    description: string,
    sourceFingerprint: string,
  ) => void;
  markAiCopyConflict: () => void;
  setTitle: (value: string) => void;
  setDescription: (value: string) => void;
  setPrice: (value: string) => void;
  setCover: (url: string, entry?: {id: number}) => void;
  setFiles: (files: FileEntry[]) => void;
  setSamples: (samples: ProductSampleDraft[]) => void;
  setBiolinkIds: (ids: number[]) => void;
  setProductType: (type: ProductType) => void;
  hydrate: (state: ProductFormState) => void;
  clear: () => void;
  setDirty: (dirty: boolean) => void;
  autoSave: () => void;
  confirmPersisted: (
    snapshot: ProductFormState,
    approvedFingerprint?: string,
  ) => void;
}

const EMPTY_STATE: ProductFormState = {
  title: '',
  description: '',
  price: '',
  coverUrl: '',
  coverFileId: null,
  files: [],
  samples: [],
  biolinkIds: [],
  productType: 'digital',
};

export function resolveInitialFormState(
  prefill: WizardPrefill | null,
): ProductFormState {
  if (!prefill) return {...EMPTY_STATE};
  return {
    ...EMPTY_STATE,
    price: prefill.price ?? '',
    productType: prefill.type ?? 'digital',
  };
}

const ProductCreationContext = createContext<{
  state: ProductFormState;
  dirty: boolean;
  autoSaveState: AutoSaveState;
  aiCopyApproval: ApprovedAiCopy | null;
  aiCopySaveConflict: boolean;
  actions: ProductCreationActions;
  billing: BillingMode | null;
} | null>(null);

export function ProductCreationProvider({
  prefill,
  productId,
  children,
}: {
  prefill: WizardPrefill | null;
  productId: number | null;
  children: ReactNode;
}) {
  const [state, setState] = useState<ProductFormState>(() =>
    resolveInitialFormState(prefill),
  );
  const [dirty, setDirty] = useState(false);
  const [autoSaveState, setAutoSaveState] = useState<AutoSaveState>('idle');
  const [aiCopyApproval, setAiCopyApproval] = useState<ApprovedAiCopy | null>(
    null,
  );
  const [aiCopySaveConflict, setAiCopySaveConflict] = useState(false);
  const markDirty = useCallback(() => {
    setDirty(true);
    setAutoSaveState('idle');
  }, []);

  const setTitle = useCallback(
    (title: string) => {
      setState(current => ({...current, title}));
      markDirty();
    },
    [markDirty],
  );
  const setDescription = useCallback(
    (description: string) => {
      // Keep the review precondition even when the creator edits the copy
      // after insertion. It remains AI-assisted until a confirmed save.
      setState(current => ({...current, description}));
      markDirty();
    },
    [markDirty],
  );
  const approveAiDescription = useCallback(
    (description: string, sourceFingerprint: string) => {
      if (productId === null || !/^[a-f0-9]{64}$/.test(sourceFingerprint))
        return;
      setAiCopyApproval({productId, sourceFingerprint});
      setState(current => ({...current, description}));
      markDirty();
    },
    [markDirty, productId],
  );
  const setPrice = useCallback(
    (price: string) => {
      setState(current => ({...current, price}));
      markDirty();
    },
    [markDirty],
  );
  const setCover = useCallback(
    (coverUrl: string, entry?: {id: number}) => {
      setState(current => ({
        ...current,
        coverUrl,
        coverFileId: entry?.id ?? null,
      }));
      markDirty();
    },
    [markDirty],
  );
  const setFiles = useCallback(
    (files: FileEntry[]) => {
      setState(current => ({...current, files}));
      markDirty();
    },
    [markDirty],
  );
  const setSamples = useCallback(
    (samples: ProductSampleDraft[]) => {
      setState(current => ({...current, samples}));
      markDirty();
    },
    [markDirty],
  );
  const setBiolinkIds = useCallback(
    (biolinkIds: number[]) => {
      setState(current => ({...current, biolinkIds}));
      markDirty();
    },
    [markDirty],
  );
  const setProductType = useCallback(
    (productType: ProductType) => {
      setState(current => ({...current, productType}));
      markDirty();
    },
    [markDirty],
  );
  const hydrate = useCallback((nextState: ProductFormState) => {
    setState(nextState);
    setAiCopyApproval(null);
    setAiCopySaveConflict(false);
    setDirty(false);
    setAutoSaveState('saved');
  }, []);
  const clear = useCallback(() => {
    setState({...EMPTY_STATE});
    setAiCopyApproval(null);
    setAiCopySaveConflict(false);
    setDirty(false);
    setAutoSaveState('idle');
  }, []);

  // The debounced body is created exactly once (useRef keeps the first
  // value), so it used to close over the FIRST render's `state`/`dirty` —
  // `dirty` is false at first render, which is why auto-save never fired and
  // a forced call would have sent the initial (empty) form. Read through a
  // ref that is refreshed on every render instead: the body always sees the
  // current state at the moment the idle window elapses.
  const latest = useRef({
    state,
    dirty,
    productId,
    aiCopyApproval,
    aiCopySaveConflict,
  });
  latest.current = {
    state,
    dirty,
    productId,
    aiCopyApproval,
    aiCopySaveConflict,
  };
  const autoSaveInFlight = useRef(false);
  const mounted = useRef(true);

  const autoSaveRef = useRef(
    debounce(async () => {
      const {state, dirty, productId, aiCopyApproval, aiCopySaveConflict} =
        latest.current;
      if (
        !productId ||
        !dirty ||
        autoSaveInFlight.current ||
        aiCopySaveConflict
      )
        return;
      autoSaveInFlight.current = true;
      if (mounted.current) setAutoSaveState('saving');
      try {
        const {apiClient} = await import('@common/http/query-client');
        await apiClient.put(`/api/v1/items/${productId}/draft`, {
          title: state.title,
          description: state.description,
          price_cents: Math.round(Number(state.price) * 100),
          currency: 'etb',
          cover_file_entry_id: state.coverFileId,
          // Always arrays: the draft endpoint allows `file_ids` to be absent,
          // but its mutation service 500s on non-course products when the key
          // is missing (EMPTY_STATE and hydrate both keep them arrays).
          file_ids: state.files.map(f => f.id),
          ...sampleRequestPayload(state.samples),
          biolink_ids: state.biolinkIds,
          type: state.productType,
          ...(aiCopyApproval?.productId === productId
            ? {ai_copy_source_fingerprint: aiCopyApproval.sourceFingerprint}
            : {}),
        });
        if (mounted.current && latest.current.productId === productId) {
          // The approval was consumed even if the creator made more edits
          // while this request was in flight. Those newer edits must save
          // normally rather than replaying the single-use precondition.
          if (aiCopyApproval) {
            setAiCopyApproval(current =>
              current?.sourceFingerprint === aiCopyApproval.sourceFingerprint
                ? null
                : current,
            );
          }
          if (latest.current.state === state) {
            setDirty(false);
            setAutoSaveState('saved');
          }
        }
      } catch (reason) {
        // A revision conflict is not a transient network error. Keep every
        // local edit and block automatic retries until a fresh server load.
        if (mounted.current && latest.current.productId === productId) {
          if (
            aiCopyApproval &&
            latest.current.aiCopyApproval?.sourceFingerprint ===
              aiCopyApproval.sourceFingerprint &&
            (reason as {response?: {status?: number}})?.response?.status === 409
          ) {
            setAiCopySaveConflict(true);
            setAutoSaveState('conflict');
          } else if (latest.current.state === state) {
            setAutoSaveState('failed');
          }
        }
      } finally {
        autoSaveInFlight.current = false;
        if (
          mounted.current &&
          latest.current.dirty &&
          latest.current.state !== state &&
          latest.current.productId === productId
        ) {
          autoSaveRef.current();
        }
      }
    }, 1500),
  );

  // Leaving the page must cancel a pending draft PUT (just-debounce-it
  // exposes .cancel()), otherwise it fires against an unmounted tree.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      autoSaveRef.current.cancel();
    };
  }, []);

  const autoSave = useCallback(() => {
    autoSaveRef.current();
  }, []);

  const markAiCopyConflict = useCallback(() => {
    setAiCopySaveConflict(true);
    setAutoSaveState('conflict');
  }, []);

  const confirmPersisted = useCallback(
    (snapshot: ProductFormState, approvedFingerprint?: string) => {
      if (!mounted.current) return;
      // Manual Save consumes its approved revision even when the creator has
      // already typed newer local edits during the request.
      if (approvedFingerprint) {
        setAiCopyApproval(current =>
          current?.sourceFingerprint === approvedFingerprint ? null : current,
        );
      }
      // Only the exact submitted state may be acknowledged; newer edits stay
      // dirty and will be persisted in a subsequent ordinary save.
      if (latest.current.state === snapshot) {
        autoSaveRef.current.cancel();
        setDirty(false);
        setAutoSaveState('saved');
      }
    },
    [],
  );

  const value = useMemo(
    () => ({
      state,
      dirty,
      autoSaveState,
      aiCopyApproval,
      aiCopySaveConflict,
      actions: {
        approveAiDescription,
        markAiCopyConflict,
        setTitle,
        setDescription,
        setPrice,
        setCover,
        setFiles,
        setSamples,
        setBiolinkIds,
        setProductType,
        hydrate,
        clear,
        setDirty,
        autoSave,
        confirmPersisted,
      },
      billing: prefill?.billing ?? null,
    }),
    [
      state,
      dirty,
      autoSaveState,
      aiCopyApproval,
      aiCopySaveConflict,
      approveAiDescription,
      markAiCopyConflict,
      setTitle,
      setDescription,
      setPrice,
      setCover,
      setFiles,
      setSamples,
      setBiolinkIds,
      setProductType,
      hydrate,
      clear,
      setDirty,
      autoSave,
      confirmPersisted,
      prefill,
    ],
  );
  return (
    <ProductCreationContext.Provider value={value}>
      {children}
    </ProductCreationContext.Provider>
  );
}

export function useProductCreation() {
  const context = useContext(ProductCreationContext);
  if (!context) {
    throw new Error(
      'useProductCreation must be used within ProductCreationProvider',
    );
  }
  return context;
}
