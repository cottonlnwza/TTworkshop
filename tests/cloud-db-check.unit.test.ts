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
});
