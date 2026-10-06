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
