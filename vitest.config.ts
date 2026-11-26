import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['test/**/*.e2e-spec.ts'],
    // Test files share one database, so they must not run in parallel.
    fileParallelism: false,
    // Tests use their own database and never touch development data.
    env: {
      DATABASE_URL: 'postgres://postgres:postgres@localhost:5433/salon_test',
    },
  },
});
