#!/usr/bin/env node
// Read-only offline preflight: no gcloud, network or cloud operations.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const required = ["Dockerfile", "api/server.ts", "api/web-static.ts", "package-lock.json", "docs/evidence/l5-03-gcp-preflight.md"];
const missing = required.filter((item) => !existsSync(resolve(item)));
if (missing.length) throw new Error("Missing deployment source files: " + missing.join(", "));
const server = readFileSync("api/server.ts", "utf8");
if (!server.includes('process.env.SERVE_WEB === "true"') || !server.includes('process.env.APP_HOST')) {
  throw new Error("Expected production web and container listen-host guards");
}
const dockerfile = readFileSync("Dockerfile", "utf8");
if (!dockerfile.includes("npm ci") || !dockerfile.includes("USER node")) {
  throw new Error("Expected deterministic build and unprivileged runtime");
}
console.log("GCP_PREFLIGHT_PASS: offline source checks only; no cloud project, secrets, deployment or billing verified.");
