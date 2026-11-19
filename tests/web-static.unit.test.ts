import { afterAll, beforeAll, describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { attachWebUi } from "../api/web-static.js";

describe("Cloud Run static UI + API same-origin routing", () => {
  let dir: string;
  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), "ttw-gcp-web-"));
    await mkdir(join(dir, "assets"));
    await writeFile(join(dir, "index.html"), "<html><body>TTworkshop SPA</body></html>");
    await writeFile(join(dir, "assets", "main.js"), "console.log('app')");
  });
  afterAll(async () => { if (dir) await rm(dir, { recursive: true, force: true }); });
  function app() {
    const server = express();
    server.get("/api/v1/auth/me", (_req, res) => res.status(401).json({ error: "unauthenticated" }));
    attachWebUi(server, dir);
    return server;
  }
  it("serves built UI at root, and SPA deep links", async () => {
    for (const path of ["/", "/workshops/123"]) {
      const response = await request(app()).get(path);
      expect(response.status).toBe(200);
      expect(response.text).toContain("TTworkshop SPA");
    }
  });
  it("serves versioned assets without SPA fallback for missing assets", async () => {
    expect((await request(app()).get("/assets/main.js")).status).toBe(200);
    expect((await request(app()).get("/assets/missing.js")).status).toBe(404);
  });
  it("preserves API routes and rejects unknown API routes", async () => {
    expect((await request(app()).get("/api/v1/auth/me")).status).toBe(401);
    expect((await request(app()).get("/api/v1/not-real")).status).toBe(404);
  });
  it("does not rewrite non-GET requests to HTML", async () => {
    expect((await request(app()).post("/workshops")).status).toBe(404);
  });
});
