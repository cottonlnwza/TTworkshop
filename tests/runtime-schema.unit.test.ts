import { describe, expect, it, vi } from "vitest";
import { migrationFiles } from "../api/migrate.js";
import { prepareDatabaseOnStartup, verifyProductionSchema } from "../api/runtime-schema.js";

const filenames = await migrationFiles();

function fakeDb(rows: Array<{ filename: string }>) {
  const query = vi.fn(async (_sql: string) => ({ rows }));
  return { query };
}

describe("production schema / migration separation", () => {
  it("checks the exact applied schema using SELECT only and never migrates", async () => {
    const db = fakeDb(filenames.map(filename => ({ filename })));
    const migrate = vi.fn(async () => { throw new Error("MIGRATION_MUST_NOT_RUN"); });
    await prepareDatabaseOnStartup(db as never, true, migrate);
    expect(migrate).not.toHaveBeenCalled();
    expect(db.query).toHaveBeenCalledOnce();
    expect(db.query.mock.calls[0]![0]).toBe("SELECT filename FROM schema_migrations ORDER BY filename");
  });

  it("rejects empty/unmigrated database on production startup without DDL", async () => {
    const db = fakeDb([]);
    const migrate = vi.fn(async () => {});
    await expect(prepareDatabaseOnStartup(db as never, true, migrate)).rejects.toThrow("schema is not ready");
    expect(migrate).not.toHaveBeenCalled();
    expect(db.query).toHaveBeenCalledOnce();
  });

  it("rejects missing and unexpected migrations after repeat/redeploy", async () => {
    for (const rows of [filenames.slice(0, -1), [...filenames, "999_unknown.sql"]]) {
      const db = fakeDb(rows.map(filename => ({ filename })));
      await expect(verifyProductionSchema(db as never)).rejects.toThrow("schema is not ready");
      expect(db.query).toHaveBeenCalledOnce();
    }
  });

  it("redacts DB error message on failure to read migration state", async () => {
    const db = { query: vi.fn(async () => { throw new Error("sensitive-connection-diagnostics"); }) };
    await expect(verifyProductionSchema(db as never)).rejects.toThrow("Production database schema is not ready");
    try {
      await verifyProductionSchema(db as never);
    } catch (error) {
      expect(String(error)).not.toContain("sensitive-connection-diagnostics");
    }
  });

  it("keeps local/test startup migrations enabled", async () => {
    const db = fakeDb([]);
    const migrate = vi.fn(async () => {});
    await prepareDatabaseOnStartup(db as never, false, migrate);
    expect(migrate).toHaveBeenCalledOnce();
    expect(db.query).not.toHaveBeenCalled();
  });

  it("propagates local migration failures without masking them", async () => {
    const db = fakeDb([]);
    const migrate = vi.fn(async () => { throw new Error("test-only-migration-failed"); });
    await expect(prepareDatabaseOnStartup(db as never, false, migrate)).rejects.toThrow("test-only-migration-failed");
  });
});
