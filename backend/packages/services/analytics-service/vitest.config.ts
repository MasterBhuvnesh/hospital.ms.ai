import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/lib/__mocks__/**',
        'src/info/**',
        'src/index.ts',
        'src/lib/prisma.ts',
        'src/lib/metrics.ts',
        'src/test-helpers/**',
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 85,
        lines: 80,
      },
    },
    mockReset: true,
  },
});
