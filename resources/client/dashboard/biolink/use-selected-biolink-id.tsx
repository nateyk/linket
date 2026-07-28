import {
  getFromLocalStorage,
  useLocalStorage,
} from '@ui/utils/hooks/local-storage';

const key = 'selectedBiolinkId';

export function useSelectedBiolinkId() {
  return useLocalStorage<number | null>(key, null);
}

export function getSelectedBiolinkId() {
  return getFromLocalStorage<number | null>(key, null);
}
