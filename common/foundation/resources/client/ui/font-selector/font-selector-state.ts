import {useValueLists} from '@common/http/value-lists';
import {BrowserSafeFonts} from '@ui/fonts/font-picker/browser-safe-fonts';
import {FontConfig} from '@ui/fonts/font-picker/font-config';
import {loadFonts} from '@ui/fonts/font-picker/load-fonts';
import {useFilter} from '@ui/i18n/use-filter';
import {chunkArray} from '@ui/utils/array/chunk-array';
import {useCallback, useEffect, useMemo, useState} from 'react';

export interface FontSelectorState extends UseFontSelectorProps {
  fonts: FontConfig[];
  filteredFonts: FontConfig[];
  pages: FontConfig[][];
  isLoading: boolean;
  query: string;
  setQuery: (query: string) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
}

export interface UseFontSelectorProps {
  value?: FontConfig;
  onChange: (value: FontConfig) => void;
}
export function useFontSelectorState({
  value,
  onChange,
}: UseFontSelectorProps): FontSelectorState {
  const {data, isLoading} = useValueLists(['googleFonts']);
  const [currentPage, setCurrentPage] = useState(0);
  const [query, _setQuery] = useState('');
  const {contains} = useFilter({
    sensitivity: 'base',
  });

  const allFonts = useMemo(() => {
    return BrowserSafeFonts.concat(data?.googleFonts ?? []);
  }, [data?.googleFonts]);

  const filteredFonts = useMemo(
    () => allFonts.filter(font => contains(font.family, query)),
    [allFonts, query, contains],
  );

  const pages = useMemo(() => chunkArray(filteredFonts, 20), [filteredFonts]);
  const fonts = pages[currentPage];

  // open the page with the selected font
  useEffect(() => {
    if (data && value?.family) {
      const index = filteredFonts.findIndex(f => f.family === value.family);
      if (index >= 0) {
        setCurrentPage(Math.floor(index / 20));
      }
    }
  }, [data, filteredFonts, value?.family]);

  useEffect(() => {
    const id = 'font-selector';
    if (fonts?.length) {
      loadFonts(fonts, {id});
    }
  }, [fonts, currentPage]);

  const setQuery = useCallback((query: string) => {
    _setQuery(query);
    // reset to first page when searching or changing category
    setCurrentPage(0);
  }, []);

  return {
    fonts: fonts || [],
    currentPage,
    filteredFonts: filteredFonts || [],
    setCurrentPage,
    isLoading,
    query,
    setQuery,
    value,
    onChange,
    pages,
  };
}
