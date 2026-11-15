import type { Pool } from "pg";
import { migrationFiles } from "./migrate.js";

type QueryOnly = Pick<Pool, "query">;

/**
 * Production server startup must never perform DDL or migrations. Only a
 * separately reviewed migration job may apply schema changes. Read-only
 * verification fails closed if a migration is missing, an unexpected version
 * is applied, or a connection/permission error occurs.
 */
export async function verifyProductionSchema(db: QueryOnly): Promise<void> {
  const expected = await migrationFiles();
  if (expected.length === 0) throw new Error("Production database schema is not ready");
  let applied: string[];
  try {
    const result = await db.query("SELECT filename FROM schema_migrations ORDER BY filename");
    applied = result.rows.map(row => row.filename as string);
  } catch {
    // Never expose driver errors containing connection or credential details.
    throw new Error("Production database schema is not ready");
  }
  if (applied.length !== expected.length || expected.some((name, index) => applied[index] !== name)) {
    throw new Error("Production database schema is not ready");
  }
}

/** Preserve existing local/test development behavior without granting prod DDL. */
export async function prepareDatabaseOnStartup(
  db: QueryOnly,
  production: boolean,
  migrateForDevelopment: () => Promise<void>,
): Promise<void> {
  if (production) {
    await verifyProductionSchema(db);
  } else {
    await migrateForDevelopment();
  }
}
