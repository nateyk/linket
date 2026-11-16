import {getBootstrapData} from '@ui/bootstrap-data/bootstrap-data-store';

// Legacy theme palettes are optional in the Linket dashboard bootstrap.
// Keep canvas colors valid when no BeDesk theme record is present.
const primaryColor =
  getBootstrapData()?.themes?.[0]?.values?.['--be-primary'] ?? '0 73 204';
export const ChartColors = [
  [
    `rgb(${primaryColor.replaceAll(' ', ',')})`,
    `rgba(${primaryColor.replaceAll(' ', ',')},0.2)`,
  ],
  ['rgb(255,112,67)', 'rgb(255,112,67,0.2)'],
  ['rgb(255,167,38)', 'rgb(255,167,38,0.2)'],
  ['rgb(141,110,99)', 'rgb(141,110,99,0.2)'],
  ['rgb(102,187,106)', 'rgba(102,187,106,0.2)'],
  ['rgb(92,107,192)', 'rgb(92,107,192,0.2)'],
];
