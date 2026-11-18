/**
 * @vitest-environment jsdom
 */
import {render, screen} from '@testing-library/react';
import {expect, test, vi} from 'vitest';

import {GeoChart} from './geo-chart';

vi.mock('./use-google-geo-chart', () => ({useGoogleGeoChart: () => {}}));

test('the map info trigger has an accessible name (axe button-name)', async () => {
  render(
    <GeoChart
      data={[{label: 'Ethiopia', value: 4, percentage: 66, code: 'ET'}]}
      onCountrySelected={() => {}}
      datasetLabel="Clicks"
    />,
  );

  const button = await screen.findByRole('button', {
    name: 'About this map',
  });
  expect(button).toBeTruthy();
});


test('unresolved locations stay in the list without rendering a misleading map', () => {
  render(
    <GeoChart
      data={[{label: 'Unknown location', value: 8, percentage: 100, code: ''}]}
      datasetLabel="Clicks"
    />,
  );

  expect(screen.getByText('Location data unavailable')).toBeTruthy();
  expect(screen.getByText('Unknown location')).toBeTruthy();
  expect(screen.queryByRole('img', {name: 'Country locations map'})).toBeNull();
});

test('known countries render a map and selectable country list', () => {
  render(
    <GeoChart
      data={[
        {label: 'Ethiopia', value: 6, percentage: 75, code: 'et'},
        {label: 'Unknown location', value: 2, percentage: 25, code: ''},
      ]}
      onCountrySelected={() => {}}
      datasetLabel="Clicks"
    />,
  );

  expect(screen.getByRole('img', {name: 'Country locations map'})).toBeTruthy();
  expect(screen.getByRole('button', {name: /Ethiopia/})).toBeTruthy();
  expect(screen.getByText(/Visits without a known country/)).toBeTruthy();
});


test('Google Analytics country labels without ISO codes still display the map', () => {
  render(
    <GeoChart
      data={[
        {label: 'Ethiopia', value: 3, percentage: 75},
        {label: '(not set)', value: 1, percentage: 25},
      ]}
      datasetLabel="Visitors"
    />,
  );

  expect(screen.getByRole('img', {name: 'Country locations map'})).toBeTruthy();
  expect(screen.getByText('Ethiopia')).toBeTruthy();
});
