// resources/client/dashboard/digital-products/product-creation-context.tsx
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
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
  actions: ProductCreationActions;
  billing: BillingMode | null;
} | null>(null);

export function ProductCreationProvider({
  prefill,
  children,
}: {
  prefill: WizardPrefill | null;
  children: ReactNode;
}) {
  const [state, setState] = useState<ProductFormState>(() =>
    resolveInitialFormState(prefill),
  );
  const setTitle = useCallback(
    (title: string) => setState(current => ({...current, title})),
    [],
  );
  const setDescription = useCallback(
    (description: string) => setState(current => ({...current, description})),
    [],
  );
  const setPrice = useCallback(
    (price: string) => setState(current => ({...current, price})),
    [],
  );
  const setCover = useCallback(
    (coverUrl: string, entry?: {id: number}) =>
      setState(current => ({
        ...current,
        coverUrl,
        coverFileId: entry?.id ?? null,
      })),
    [],
  );
  const setFiles = useCallback(
    (files: FileEntry[]) => setState(current => ({...current, files})),
    [],
  );
  const setBiolinkIds = useCallback(
    (biolinkIds: number[]) => setState(current => ({...current, biolinkIds})),
    [],
  );
  const setProductType = useCallback(
    (productType: ProductType) =>
      setState(current => ({...current, productType})),
    [],
  );
  const clear = useCallback(() => setState({...EMPTY_STATE}), []);
  const value = useMemo(
    () => ({
      state,
      actions: {
        setTitle,
        setDescription,
        setPrice,
        setCover,
        setFiles,
        setBiolinkIds,
        setProductType,
        clear,
      },
      billing: prefill?.billing ?? null,
    }),
    [
      state,
      setTitle,
      setDescription,
      setPrice,
      setCover,
      setFiles,
      setBiolinkIds,
      setProductType,
      clear,
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
