import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.js";

const { Pool } = pg;

// We will initialize the pool in server.ts or here.
// Let's export a function to get the db
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;
let pool: pg.Pool | null = null;

export function getDb() {
  if (!dbInstance) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is missing");
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    dbInstance = drizzle(pool, { schema });
  }
  return dbInstance;
}

export async function initDb() {
  if (!process.env.DATABASE_URL) return;
  const p = pool || new Pool({ connectionString: process.env.DATABASE_URL });
  await p.query(`
    CREATE TABLE IF NOT EXISTS journals (
      id SERIAL PRIMARY KEY,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS interactions (
      id SERIAL PRIMARY KEY,
      music_params JSONB NOT NULL,
      user_response TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
  `);
}
