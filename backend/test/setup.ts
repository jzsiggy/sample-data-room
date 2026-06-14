import { afterAll, beforeEach } from "vitest";
import { prisma } from "../src/prisma";

/**
 * Truncates every table in the public schema so each test starts clean. With
 * no models yet this is a safe no-op; it stays correct as the schema grows.
 */
export async function resetDatabase(): Promise<void> {
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `;
  for (const { tablename } of tables) {
    if (tablename.startsWith("_")) continue; // skip Prisma's bookkeeping tables
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE "public"."${tablename}" RESTART IDENTITY CASCADE`,
    );
  }
}

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});
