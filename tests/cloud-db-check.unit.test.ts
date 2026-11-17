import { describe, expect, it, vi } from "vitest";
import { verifyCloudDbConnection } from "../api/cloud-db-check.js";

describe("cloud-db-check read-only connection verification", () => {
  it("passes for the exact intended database and user using SELECT only", async () => {
    const query = vi.fn(async (_sql: string) => ({
      rows: [{ database_name: "ttworkshop", role_name: "ttworkshop_app", probe_ok: 1 }],
    }));
    await verifyCloudDbConnection({ query });
    expect(query).toHaveBeenCalledOnce();
    expect(query.mock.calls[0]![0]).toMatch(/^SELECT current_database\(\)/);
  });

  it.each([
    ["unexpected database", "postgres", "ttworkshop_app", 1],
    ["unexpected role", "ttworkshop", "postgres", 1],
    ["unexpected probe result", "ttworkshop", "ttworkshop_app", 0],
  ])("rejects %s", async (_name, database_name, role_name, probe_ok) => {
    const query = vi.fn(async () => ({ rows: [{ database_name, role_name, probe_ok }] }));
    await expect(verifyCloudDbConnection({ query })).rejects.toThrow("Unexpected Cloud SQL");
    expect(query).toHaveBeenCalledOnce();
  });

  it("rejects missing query rows", async () => {
    const query = vi.fn(async () => ({ rows: [] }));
    await expect(verifyCloudDbConnection({ query })).rejects.toThrow("Unexpected Cloud SQL");
  });

  it("passes for migration-only credentials when that identity is explicitly selected", async () => {
    const query = vi.fn(async (_sql: string) => ({
      rows: [{ database_name: "ttworkshop", role_name: "ttworkshop_migrator", probe_ok: 1 }],
    }));
    await verifyCloudDbConnection({ query }, "ttworkshop_migrator");
    expect(query).toHaveBeenCalledOnce();
    expect(query.mock.calls[0]![0]).toMatch(/^SELECT current_database\(\)/);
  });

  it("rejects a migration login if a runtime check is configured", async () => {
    const query = vi.fn(async () => ({
      rows: [{ database_name: "ttworkshop", role_name: "ttworkshop_migrator", probe_ok: 1 }],
    }));
    await expect(verifyCloudDbConnection({ query })).rejects.toThrow("Unexpected Cloud SQL");
  });

  it("rejects an unknown expected identity without opening a database connection", async () => {
    const query = vi.fn();
    await expect(verifyCloudDbConnection({ query }, "postgres")).rejects.toThrow("Unsupported Cloud SQL");
    expect(query).not.toHaveBeenCalled();
  });

  it("rejects unexpected additional identity rows", async () => {
    const query = vi.fn(async () => ({ rows: [
      { database_name: "ttworkshop", role_name: "ttworkshop_app", probe_ok: 1 },
      { database_name: "ttworkshop", role_name: "ttworkshop_app", probe_ok: 1 },
    ] }));
    await expect(verifyCloudDbConnection({ query })).rejects.toThrow("Unexpected Cloud SQL");
  });
});
