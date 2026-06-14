import { execSync } from "node:child_process";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://dataroom:dataroom@localhost:5432/dataroom_test?schema=public";

/**
 * Applies the Prisma schema to the test database once before the suite runs,
 * proving the DB plumbing end-to-end. With the empty walking-skeleton schema
 * this just connects; it keeps the test DB in sync as models are added.
 */
export default function setup(): void {
  execSync("pnpm exec prisma db push --skip-generate --accept-data-loss", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });
}
