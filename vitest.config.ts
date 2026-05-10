import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts', 'src/**/*.tsx', 'server.ts'],
      exclude: [
        'src/test-setup.ts',
        'src/__tests__/**',
        'src/components/__tests__/**',
        'src/lib/*.test.ts',
        'node_modules/**',
        'dist/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
