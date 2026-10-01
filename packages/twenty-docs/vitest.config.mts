import path from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../twenty-front/src/modules'),
    },
  },
  test: {
    root: 'packages/twenty-docs',
    include: ['scripts/**/*.spec.ts'],
    globals: true,
  },
});
