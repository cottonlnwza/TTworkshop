#!/usr/bin/env node
// Read-only offline preflight: no gcloud, network or cloud operations.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const required = [
  "Dockerfile", "api/server.ts", "api/web-static.ts", "api/cloud-db-check.ts",
  "scripts/cloud-db-check.ts", "api/runtime-schema.ts", "deploy/db-role-review.md",
  "deploy/command-review.md", "package-lock.json",
  "docs/evidence/l5-03-gcp-preflight.md",
];
const missing = required.filter((item) => !existsSync(resolve(item)));
if (missing.length) throw new Error("Missing deployment source files: " + missing.join(", "));
const server = readFileSync("api/server.ts", "utf8");
if (!server.includes('process.env.SERVE_WEB === "true"') || !server.includes('process.env.APP_HOST')) {
  throw new Error("Expected production web and container listen-host guards");
}
if (!server.includes("prepareDatabaseOnStartup(pool, production") || server.includes("await migrate(pool)")) {
  throw new Error("Production startup must separate read-only schema checks from DDL migrations");
}
const dockerfile = readFileSync("Dockerfile", "utf8");
if (!dockerfile.includes("npm ci") || !dockerfile.includes("USER node")) {
  throw new Error("Expected deterministic build and unprivileged runtime");
}
const dbCheck = readFileSync("scripts/cloud-db-check.ts", "utf8");
if (!dbCheck.includes("CLOUD_DB_CHECK_PASS") || !dbCheck.includes("CLOUD_DB_CHECK_FAIL") ||
    !dbCheck.includes("verifyCloudDbConnection") || !dbCheck.includes("CLOUD_DB_EXPECTED_USER")) {
  throw new Error("Expected read-only cloud database preflight entrypoint");
}
console.log("GCP_PREFLIGHT_PASS: offline source checks only; no cloud project, secrets, deployment or billing verified.");
