import {test, expect, vi} from 'vitest';

vi.mock('@common/http/query-client', () => ({
  orvalApiFetch: vi.fn(async () => ({data: []})),
}));

import {orvalApiFetch} from '@common/http/query-client';
import {digitalProductsIndex} from './digital-products';

test('digitalProductsIndex hits the renamed items index endpoint', async () => {
  await digitalProductsIndex({params: {per_page: 100}} as any);

  expect(vi.mocked(orvalApiFetch)).toHaveBeenCalledWith(
    {url: '/items', method: 'GET'},
    {params: {per_page: 100}},
  );
});
