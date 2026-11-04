import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import type { Pool } from "pg";
const migrationFolder = resolve(dirname(fileURLToPath(import.meta.url)), "../db/migrations");
export async function migrate(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(48033401)");
    await client.query("CREATE TABLE IF NOT EXISTS schema_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())");
    for (const file of (await readdir(migrationFolder)).filter(f => /^\d+_.*\.sql$/.test(f)).sort()) {
      if ((await client.query("SELECT 1 FROM schema_migrations WHERE filename=$1", [file])).rowCount) continue;
      await client.query(await readFile(resolve(migrationFolder, file), "utf8"));
      await client.query("INSERT INTO schema_migrations(filename) VALUES($1)", [file]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}
