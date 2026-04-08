import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'http://localhost/',
      },
    },
    setupFiles: ['tests/unit/setup.ts'],
    include: ['tests/unit/**/*.test.ts'],
    globals: true,
  },
});
