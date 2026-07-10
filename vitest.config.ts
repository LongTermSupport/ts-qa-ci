import { defineConfig } from 'vitest/config';

// Test harness for ts-qa-ci's own rules. `globals: true` exposes describe/it,
// which ESLint's RuleTester picks up automatically so each ruleTester.run(...)
// registers its cases as native vitest tests. Tests live beside the rules as
// src/**/*.test.ts and are excluded from the tsc build (see tsconfig.json).
export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
