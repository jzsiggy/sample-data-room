import { defineConfig } from "vitest/config";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://dataroom:dataroom@localhost:5432/dataroom_test?schema=public";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    // The test DB is shared mutable state, so run test files serially.
    fileParallelism: false,
    globalSetup: ["./test/global-setup.ts"],
    setupFiles: ["./test/setup.ts"],
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      COOKIE_SECRET: "test-cookie-secret",
    },
  },
});
