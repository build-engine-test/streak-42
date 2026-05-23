/**
 * Typed Postgres client backed by postgres-js + Drizzle ORM.
 *
 * Use the exported `db` everywhere application code touches Postgres so we
 * get typed query results from the canonical schema. The connection is
 * lazily memoized so importing this module from a Server Component or
 * route handler does not eagerly open a socket at build time.
 */
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";

import * as schema from "./schema";

export class MissingDatabaseUrlError extends Error {
  constructor() {
    super(
      "DATABASE_URL is not set. Configure it in the environment (Render secret, .env.local, etc.) before talking to Postgres.",
    );
    this.name = "MissingDatabaseUrlError";
  }
}

export type DbSchema = typeof schema;
export type Database = PostgresJsDatabase<DbSchema>;

interface DbHandles {
  client: Sql;
  db: Database;
}

let handles: DbHandles | null = null;

function buildHandles(): DbHandles {
  const url = process.env.DATABASE_URL;
  if (!url || url.length === 0) {
    throw new MissingDatabaseUrlError();
  }

  // `max: 1` keeps us friendly with Render's Postgres connection cap when
  // multiple server-rendered routes import this module concurrently.
  // `prepare: false` is required for Render's PgBouncer-style poolers and
  // is the documented postgres-js setting for serverless-ish hosts.
  const client = postgres(url, {
    max: 1,
    prepare: false,
    idle_timeout: 20,
  });

  const db = drizzle(client, { schema });
  return { client, db };
}

function getHandles(): DbHandles {
  if (handles === null) {
    handles = buildHandles();
  }
  return handles;
}

/**
 * Lazily-initialized typed Drizzle client. Throws `MissingDatabaseUrlError`
 * on first access when `DATABASE_URL` is absent.
 */
export const db: Database = new Proxy({} as Database, {
  get(_target, prop, receiver) {
    const real = getHandles().db as unknown as Record<PropertyKey, unknown>;
    const value = Reflect.get(real, prop, receiver);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

/** Escape hatch for tasks (migrations, scripts) that need the raw client. */
export function getSqlClient(): Sql {
  return getHandles().client;
}

/** Close the pool. Intended for graceful shutdown and tests only. */
export async function closeDb(): Promise<void> {
  if (handles === null) return;
  await handles.client.end({ timeout: 5 });
  handles = null;
}

export { schema };
