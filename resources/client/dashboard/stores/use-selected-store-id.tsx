import {
  getFromLocalStorage,
  useLocalStorage,
} from '@ui/utils/hooks/local-storage';

const storeKey = 'selectedStoreId';
const legacyKey = 'selectedBiolinkId';

export function useSelectedStoreId() {
  return useLocalStorage<number | null>(storeKey, null);
}

export function getSelectedStoreId() {
  const v = getFromLocalStorage<number | null>(storeKey, null);
  if (v != null) return v;
  return getFromLocalStorage<number | null>(legacyKey, null);
}

// compat aliases — old code imports from biolink path
export const useSelectedBiolinkId = useSelectedStoreId;
export const getSelectedBiolinkId = getSelectedStoreId;
