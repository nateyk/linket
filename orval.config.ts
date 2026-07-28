import {defineConfig} from 'orval';

export default defineConfig({
  app: {
    input: './resources/client/api.json',
    output: {
      mode: 'tags',
      target: './resources/client/gen/api.ts',
      schemas: './resources/client/gen/schemas',
      namingConvention: 'kebab-case',
      formatter: 'prettier',
      clean: true,
      indexFiles: false,
      headers: false,
      override: {
        useTypeOverInterfaces: true,
        mutator: {
          path: './common/foundation/resources/client/http/query-client.ts',
          name: 'orvalApiFetch',
        },
      },
    },
  },
});
