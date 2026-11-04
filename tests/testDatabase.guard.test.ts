import { describe, expect, it } from "vitest";
import { requireTestDatabaseUrl } from "./helpers/testDatabase.js";

describe("R-02 test-database guard (no database mutations)", () => {
  it("accepts only exact database name on a loopback host", () => {
    expect(requireTestDatabaseUrl("postgresql://tester@127.0.0.1:55432/ttworkshop_test"))
      .toBe("postgresql://tester@127.0.0.1:55432/ttworkshop_test");
  });
  it("rejects a dangerous query-marker bypass targeting a different DB", () => {
    expect(() => requireTestDatabaseUrl(
      "postgresql://tester@127.0.0.1:55432/ttworkshop_prod?application_name=ttworkshop_test"
    )).toThrow(/exact local ttworkshop_test/);
  });
  it("rejects remote DB hosts, missing DB, fragments, and incorrect schemes", () => {
    for (const value of [
      "postgresql://tester@db.example.invalid:5432/ttworkshop_test",
      "postgresql://tester@127.0.0.1:55432/postgres",
      "postgresql://tester@127.0.0.1:55432/",
      "https://127.0.0.1/ttworkshop_test",
      undefined
    ]) expect(() => requireTestDatabaseUrl(value)).toThrow();
  });
});
