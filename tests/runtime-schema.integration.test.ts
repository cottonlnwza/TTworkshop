import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Pool } from "pg";
import { migrate, migrationFiles } from "../api/migrate.js";
import { prepareDatabaseOnStartup } from "../api/runtime-schema.js";
import { assertTestDatabase, requireTestDatabaseUrl } from "./helpers/testDatabase.js";

// Never connect to Cloud SQL or the development database for destructive tests.
// Hosted CI supplies an explicitly isolated loopback PostgreSQL 15 database.
const url = requireTestDatabaseUrl(process.env.PG_TEST_URL);
const pool = new Pool({ connectionString: url });

beforeAll(async () => {
  await assertTestDatabase(pool);
  await migrate(pool);
});
afterAll(async () => { await pool.end(); });

describe("reviewer AC-L5-13: read-only production startup and idempotent migration", () => {
  it("starts production against cleanly migrated schema with no DDL", async () => {
    const migrateSpy = vi.fn(async () => { throw new Error("Unexpected migration on runtime start"); });
    await prepareDatabaseOnStartup(pool, true, migrateSpy);
    await prepareDatabaseOnStartup(pool, true, migrateSpy);
    expect(migrateSpy).not.toHaveBeenCalled();
  });

  it("re-running the dedicated migration is idempotent for tracked versions", async () => {
    const before = (await pool.query("SELECT filename FROM schema_migrations ORDER BY filename"))
      .rows.map(row => row.filename as string);
    await migrate(pool);
    const after = (await pool.query("SELECT filename FROM schema_migrations ORDER BY filename"))
      .rows.map(row => row.filename as string);
    expect(after).toEqual(before);
    expect(after).toEqual(await migrationFiles());
  });

  it("fails closed when a tracked version is missing, without persisting deletion", async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const [latest] = [...await migrationFiles()].reverse();
      expect(latest).toBeDefined();
      await client.query("DELETE FROM schema_migrations WHERE filename=$1", [latest]);
      const migrateSpy = vi.fn(async () => { throw new Error("Unexpected implicit repair"); });
      await expect(prepareDatabaseOnStartup(client as never, true, migrateSpy))
        .rejects.toThrow("Production database schema is not ready");
      expect(migrateSpy).not.toHaveBeenCalled();
    } finally {
      // Always undo the synthetic change on the dedicated CI database.
      await client.query("ROLLBACK");
      client.release();
    }
    await prepareDatabaseOnStartup(pool, true, async () => { throw new Error("should not migrate"); });
  });
});
