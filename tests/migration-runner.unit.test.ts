import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const script = resolve("scripts/migrate.ts");
const tsx = resolve("node_modules/tsx/dist/cli.mjs");

describe("dedicated migration runner never logs raw credentials", () => {
  it("fails closed if no credential was injected", () => {
    const env = { ...process.env };
    delete env.DATABASE_URL;
    const run = spawnSync(process.execPath, [tsx, script], {
      env, encoding: "utf8", timeout: 15000,
    });
    expect(run.status).toBe(1);
    expect(run.stderr).toContain("DB_MIGRATE_FAIL: migration credential not supplied");
    expect(run.stdout).toBe("");
  });

  it("redacts driver failures from an invalid loopback-only test URL", () => {
    const syntheticPassword = "SYNTHETIC_DO_NOT_LOG_123";
    const run = spawnSync(process.execPath, [tsx, script], {
      env: {
        ...process.env,
        DATABASE_URL: `postgresql://synthetic:${syntheticPassword}@127.0.0.1:1/ttworkshop_test`,
      },
      encoding: "utf8", timeout: 15000,
    });
    expect(run.status).toBe(1);
    expect(run.stderr).toContain("DB_MIGRATE_FAIL: schema migration rejected");
    expect(run.stderr).not.toContain(syntheticPassword);
    expect(run.stdout).not.toContain(syntheticPassword);
  });
});
