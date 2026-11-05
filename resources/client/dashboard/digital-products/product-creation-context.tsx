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

export type AutoSaveState = 'idle' | 'saving' | 'saved' | 'failed';

export interface ProductCreationActions {
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
  confirmPersisted: (snapshot: ProductFormState) => void;
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
      setState(current => ({...current, description}));
      markDirty();
    },
    [markDirty],
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
    setDirty(false);
    setAutoSaveState('saved');
  }, []);
  const clear = useCallback(() => {
    setState({...EMPTY_STATE});
    setDirty(false);
    setAutoSaveState('idle');
  }, []);

  // The debounced body is created exactly once (useRef keeps the first
  // value), so it used to close over the FIRST render's `state`/`dirty` —
  // `dirty` is false at first render, which is why auto-save never fired and
  // a forced call would have sent the initial (empty) form. Read through a
  // ref that is refreshed on every render instead: the body always sees the
  // current state at the moment the idle window elapses.
  const latest = useRef({state, dirty, productId});
  latest.current = {state, dirty, productId};
  const autoSaveInFlight = useRef(false);
  const mounted = useRef(true);

  const autoSaveRef = useRef(
    debounce(async () => {
      const {state, dirty, productId} = latest.current;
      if (!productId || !dirty || autoSaveInFlight.current) return;
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
        });
        if (mounted.current && latest.current.state === state && latest.current.productId === productId) {
          setDirty(false);
          setAutoSaveState('saved');
        }
      } catch {
        // Never claim persistence after an error; leave the edited form dirty.
        if (mounted.current && latest.current.state === state && latest.current.productId === productId) {
          setAutoSaveState('failed');
        }
      } finally {
        autoSaveInFlight.current = false;
        if (mounted.current && latest.current.dirty && latest.current.state !== state && latest.current.productId === productId) {
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

  const confirmPersisted = useCallback((snapshot: ProductFormState) => {
    // Manual Save can finish after further user edits. Only the exact
    // submitted state may be acknowledged; newer edits must remain dirty.
    if (mounted.current && latest.current.state === snapshot) {
      autoSaveRef.current.cancel();
      setDirty(false);
      setAutoSaveState('saved');
    }
  }, []);

  const value = useMemo(
    () => ({
      state,
      dirty,
      autoSaveState,
      actions: {
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
