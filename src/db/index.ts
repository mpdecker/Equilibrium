import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import * as schema from "./schema.js";

const { Pool } = pg;

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;
let pool: pg.Pool | null = null;

function migrationsFolder(): string {
  return path.resolve(process.cwd(), "drizzle");
}

export function getPool(): pg.Pool | null {
  return pool;
}

export function getDb(): ReturnType<typeof drizzle<typeof schema>> {
  if (!dbInstance) {
    throw new Error("Database not initialized; call initDb() during server bootstrap");
  }
  return dbInstance;
}

/**
 * Run Drizzle migrations and wire a single shared pool + drizzle client.
 * Idempotent on empty `DATABASE_URL` (no-op).
 */
export async function initDb(): Promise<void> {
  if (!process.env.DATABASE_URL) return;

  try {
    if (!pool) {
      pool = new Pool({ connectionString: process.env.DATABASE_URL });
    }
    const db = drizzle(pool, { schema });
    await migrate(db, { migrationsFolder: migrationsFolder() });
    dbInstance = db;
  } catch (e) {
    dbInstance = null;
    if (pool) {
      const p = pool;
      pool = null;
      await p.end().catch(() => undefined);
    }
    throw e;
  }
}

export async function closeDb(): Promise<void> {
  dbInstance = null;
  if (pool) {
    const p = pool;
    pool = null;
    await p.end();
  }
}
