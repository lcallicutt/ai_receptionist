/**
 * Database client.
 *
 * Production / staging: Neon Postgres via DATABASE_URL (postgres-js driver).
 * Local development fallback: embedded PGlite database in .data/ so the app,
 * seed script, and tests run without external services. PGlite is Postgres
 * WASM — the same Drizzle schema and SQL run against both.
 */
import path from "path";
import * as schema from "./schema";

import type { PgliteDatabase } from "drizzle-orm/pglite";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

export type Db =
  | (PgliteDatabase<typeof schema> & { $client?: unknown })
  | (PostgresJsDatabase<typeof schema> & { $client?: unknown });

const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");

type GlobalWithDb = typeof globalThis & {
  __flownetDbPromise?: Promise<Db>;
};

async function createDb(): Promise<Db> {
  const url = process.env.DATABASE_URL;

  if (url) {
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    const postgres = (await import("postgres")).default;
    const client = postgres(url, { max: 5 });
    const db = drizzle(client, { schema });
    if (process.env.DB_AUTO_MIGRATE === "true") {
      await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
    }
    return db;
  }

  // Dev/demo fallback — embedded PGlite, persisted to .data/pglite
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dataDir = process.env.PGLITE_DATA_DIR ?? path.join(process.cwd(), ".data", "pglite");
  if (!dataDir.startsWith("memory://")) {
    const { mkdirSync } = await import("fs");
    mkdirSync(dataDir, { recursive: true });
  }
  const client = new PGlite(dataDir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return db;
}

/** Lazily-initialized singleton. Always access the DB through this. */
export function getDb(): Promise<Db> {
  const g = globalThis as GlobalWithDb;
  if (!g.__flownetDbPromise) {
    g.__flownetDbPromise = createDb();
  }
  return g.__flownetDbPromise;
}

export { schema };
