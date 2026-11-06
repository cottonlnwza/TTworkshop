import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { assertTestDatabase, requireTestDatabaseUrl } from "./helpers/testDatabase.js";

const testDatabaseUrl = requireTestDatabaseUrl(process.env.PG_TEST_URL);
const pool = new Pool({ connectionString: testDatabaseUrl });
const fixtureTitles = [
  "F-02 Test Draft Partial",
  "F-02 Test Draft Complete",
  "F-02 Test Published",
];

function runSeedOnce(): Promise<{ code: number | null; output: string }> {
  const tsxCli = resolve(process.cwd(), "node_modules/tsx/dist/cli.mjs");
  const seedScript = resolve(process.cwd(), "scripts/seed.ts");
  const child = spawn(process.execPath, [tsxCli, seedScript], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PG_TEST_URL: testDatabaseUrl,
      DATABASE_URL: testDatabaseUrl,
      SEED_PASSWORD: process.env.SEED_PASSWORD ?? randomBytes(24).toString("base64url"),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  return new Promise((resolvePromise, rejectPromise) => {
    let output = "";
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => { output += chunk; });
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => { output += chunk; });
    child.once("error", rejectPromise);
    child.once("close", (code) => resolvePromise({ code, output }));
  });
}

beforeAll(async () => {
  await assertTestDatabase(pool);
});

afterAll(async () => {
  await pool.end();
});

describe("Seed idempotency (R-10)", () => {
  it("running the seed twice creates the F-02 fixtures exactly once", async () => {
    // Remove only these named synthetic fixtures, and only after verifying the exact test DB.
    await pool.query("DELETE FROM workshops WHERE title = ANY($1::text[])", [fixtureTitles]);

    const firstRun = await runSeedOnce();
    expect(firstRun.code, firstRun.output).toBe(0);
    const afterFirst = await pool.query(
      "SELECT title, COUNT(*)::int AS n FROM workshops WHERE title = ANY($1::text[]) GROUP BY title",
      [fixtureTitles],
    );

    const secondRun = await runSeedOnce();
    expect(secondRun.code, secondRun.output).toBe(0);
    const afterSecond = await pool.query(
      "SELECT title, COUNT(*)::int AS n FROM workshops WHERE title = ANY($1::text[]) GROUP BY title",
      [fixtureTitles],
    );

    const countsFirst = new Map(afterFirst.rows.map((row: { title: string; n: number }) => [row.title, row.n]));
    const countsSecond = new Map(afterSecond.rows.map((row: { title: string; n: number }) => [row.title, row.n]));
    for (const title of fixtureTitles) {
      expect(countsFirst.get(title), `first seed run: ${title}`).toBe(1);
      expect(countsSecond.get(title), `second seed run: ${title}`).toBe(1);
    }
  }, 60000);
});
