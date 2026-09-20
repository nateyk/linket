// resources/client/dashboard/digital-products/product-creation-context.tsx
import {
  createContext,
  useCallback,
  useContext,
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

export interface ProductFormState {
  title: string;
  description: string;
  price: string;
  coverUrl: string;
  coverFileId: number | null;
  files: FileEntry[];
  biolinkIds: number[];
  productType: ProductType;
}

export interface ProductCreationActions {
  setTitle: (value: string) => void;
  setDescription: (value: string) => void;
  setPrice: (value: string) => void;
  setCover: (url: string, entry?: {id: number}) => void;
  setFiles: (files: FileEntry[]) => void;
  setBiolinkIds: (ids: number[]) => void;
  setProductType: (type: ProductType) => void;
  clear: () => void;
  setDirty: (dirty: boolean) => void;
  autoSave: () => void;
}

const EMPTY_STATE: ProductFormState = {
  title: '',
  description: '',
  price: '',
  coverUrl: '',
  coverFileId: null,
  files: [],
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

  const setTitle = useCallback(
    (title: string) => {
      setState(current => ({...current, title}));
      setDirty(true);
    },
    [],
  );
  const setDescription = useCallback(
    (description: string) => {
      setState(current => ({...current, description}));
      setDirty(true);
    },
    [],
  );
  const setPrice = useCallback(
    (price: string) => {
      setState(current => ({...current, price}));
      setDirty(true);
    },
    [],
  );
  const setCover = useCallback(
    (coverUrl: string, entry?: {id: number}) => {
      setState(current => ({
        ...current,
        coverUrl,
        coverFileId: entry?.id ?? null,
      }));
      setDirty(true);
    },
    [],
  );
  const setFiles = useCallback(
    (files: FileEntry[]) => {
      setState(current => ({...current, files}));
      setDirty(true);
    },
    [],
  );
  const setBiolinkIds = useCallback(
    (biolinkIds: number[]) => {
      setState(current => ({...current, biolinkIds}));
      setDirty(true);
    },
    [],
  );
  const setProductType = useCallback(
    (productType: ProductType) => {
      setState(current => ({...current, productType}));
      setDirty(true);
    },
    [],
  );
  const clear = useCallback(() => {
    setState({...EMPTY_STATE});
    setDirty(false);
  }, []);

  const autoSave = useCallback(
    debounce(async () => {
      if (!productId || !dirty) return;
      try {
        const {apiClient} = await import('@common/http/query-client');
        await apiClient.put(`/api/v1/digital-products/${productId}/draft`, {
          title: state.title,
          description: state.description,
          price_cents: Math.round(Number(state.price) * 100),
          currency: 'etb',
          cover_file_entry_id: state.coverFileId,
          file_ids: state.files.map(f => f.id),
          biolink_ids: state.biolinkIds,
          type: state.productType,
        });
        setDirty(false);
      } catch {
        // Silent fail - auto-save is best effort
      }
    }, 1500),
    [productId, state, dirty],
  );

  const value = useMemo(
    () => ({
      state,
      dirty,
      actions: {
        setTitle,
        setDescription,
        setPrice,
        setCover,
        setFiles,
        setBiolinkIds,
        setProductType,
        clear,
        setDirty,
        autoSave,
      },
      billing: prefill?.billing ?? null,
    }),
    [
      state,
      dirty,
      setTitle,
      setDescription,
      setPrice,
      setCover,
      setFiles,
      setBiolinkIds,
      setProductType,
      clear,
      setDirty,
      autoSave,
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
