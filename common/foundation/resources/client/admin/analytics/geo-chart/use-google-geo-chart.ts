import {message} from '@ui/i18n/message';
import {useTrans} from '@ui/i18n/use-trans';
import {useSettings} from '@ui/settings/use-settings';
import {convertColorToFormat} from '@ui/themes/utils/convert-color-to-format';
import {getCurrentThemeValue} from '@ui/themes/utils/get-current-theme-value';
import lazyLoader from '@ui/utils/loaders/lazy-loader';
import {RefObject, useCallback, useEffect, useRef, useState} from 'react';

type LocationDatasetItem = {
  label?: string;
  value: number;
  percentage: number;
  code?: string;
};

const loaderUrl = 'https://www.gstatic.com/charts/loader.js';

interface UseGoogleGeoChartProps {
  placeholderRef: RefObject<HTMLDivElement | null>;
  data: LocationDatasetItem[];
  enabled?: boolean;
  onCountrySelected?: (countryCode: string) => void;
  country?: string;
  datasetLabel?: string;
}

export function useGoogleGeoChart({
  placeholderRef,
  data,
  enabled = true,
  country,
  onCountrySelected,
  datasetLabel,
}: UseGoogleGeoChartProps) {
  const {trans} = useTrans();
  const {analytics} = useSettings();
  const apiKey = analytics?.gchart_api_key;
  const chartRef = useRef<google.visualization.GeoChart | null>(null);
  const chartElementRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const canSelectRegion = !!onCountrySelected && !country;
  const hasData = data.length > 0;

  useEffect(() => {
    if (!enabled || !hasData) return;
    let cancelled = false;

    async function loadChart() {
      try {
        // loadAsset returns the existing in-flight promise for other charts.
        // Do not exit early when loader.js was already used on another page.
        await lazyLoader.loadAsset(loaderUrl, {
          type: 'js',
          id: 'google-charts-js',
        });
        if (cancelled || typeof google === 'undefined') return;

        await google.charts.load('current', {
          packages: ['geochart'],
          mapsApiKey: apiKey,
        });
        if (!cancelled) setReady(true);
      } catch {
        // Location counts remain readable even when the map library is blocked.
      }
    }

    void loadChart();
    return () => {
      cancelled = true;
    };
  }, [apiKey, enabled, hasData]);

  const drawGoogleChart = useCallback(() => {
    const element = placeholderRef.current;
    if (
      !enabled ||
      !ready ||
      !hasData ||
      !element ||
      element.clientWidth === 0 ||
      typeof google === 'undefined' ||
      !google.visualization?.GeoChart
    ) {
      return;
    }

    // ISO code resolves consistently in Google's map, regardless of the
    // translated country name shown in the adjacent accessible list.
    const rows = data.map(location => [
      country ? location.label : (location.code?.toUpperCase() || location.label),
      Number(location.value) || 0,
    ]);
    const header = [
      country ? trans(message('City')) : trans(message('Country')),
      datasetLabel ?? trans(message('Clicks')),
    ];

    const backgroundColor = convertColorToFormat(
      getCurrentThemeValue('--be-background'),
      'hex',
    );
    const chartColor = convertColorToFormat(
      getCurrentThemeValue('--be-primary'),
      'hex',
    );

    const options: google.visualization.GeoChartOptions = {
      colorAxis: {colors: [chartColor]},
      backgroundColor,
      region: country ? country.toUpperCase() : undefined,
      resolution: country ? 'provinces' : 'countries',
      displayMode: country ? 'markers' : 'regions',
      enableRegionInteractivity: canSelectRegion,
      width: element.clientWidth,
      height: element.clientHeight,
    };

    if (!chartRef.current || chartElementRef.current !== element) {
      chartRef.current = new google.visualization.GeoChart(element);
      chartElementRef.current = element;
    }

    chartRef.current.draw(
      google.visualization.arrayToDataTable([header, ...rows]),
      options,
    );
  }, [placeholderRef, enabled, ready, hasData, data, country, datasetLabel, trans, canSelectRegion]);

  useEffect(() => {
    drawGoogleChart();
  }, [drawGoogleChart]);

  useEffect(() => {
    const element = placeholderRef.current;
    if (!ready || !enabled || !element || typeof ResizeObserver === 'undefined') return;

    let previousWidth = element.clientWidth;
    let previousHeight = element.clientHeight;
    const observer = new ResizeObserver(() => {
      if (
        previousWidth === element.clientWidth &&
        previousHeight === element.clientHeight
      ) return;

      previousWidth = element.clientWidth;
      previousHeight = element.clientHeight;
      drawGoogleChart();
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [enabled, ready, drawGoogleChart, placeholderRef]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!ready || !enabled || !chart || !onCountrySelected || typeof google === 'undefined') {
      return;
    }

    const listener = google.visualization.events.addListener(
      chart,
      'regionClick',
      (event: {region: string}) => onCountrySelected(event.region),
    );

    return () => google.visualization.events.removeListener(listener);
  }, [ready, enabled, onCountrySelected, canSelectRegion]);

  return {drawGoogleChart};
}
