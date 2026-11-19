import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Pool } from "pg";
import request from "supertest";
import { createApp } from "../api/app.js";
import { attachDeploymentRoutes } from "../api/web-static.js";

// Exercise the SAME app and deployment-route composer used by api/server.ts.
// No database login or network connection: query results are deterministic.
describe("production SERVE_WEB health routing / Cloud Run smoke contract", () => {
  let dist: string;
  beforeAll(async () => {
    dist = await mkdtemp(join(tmpdir(), "ttw-health-route-"));
    await writeFile(join(dist, "index.html"), "<!doctype html><html>TTworkshop UI</html>");
    // A prebuilt artifact must never mask the health handler.
    await writeFile(join(dist, "health"), "wrong static health response");
    await writeFile(join(dist, "healthz"), "wrong retired health response");
  });
  afterAll(async () => { if (dist) await rm(dist, { recursive: true, force: true }); });

  function productionApp(query: (sql: string) => Promise<unknown>, serveWeb = true) {
    const probe = vi.fn(query);
    const app = createApp({ query: probe } as unknown as Pool, {
      appOrigin: "https://ttworkshop.example.test", production: true, sessionHours: 8,
    });
    attachDeploymentRoutes(app, { query: probe }, { serveWeb, distDirectory: dist });
    return { app, probe };
  }

  it("returns DB-backed JSON 200 before the SPA catch-all when PostgreSQL responds", async () => {
    const { app, probe } = productionApp(async () => ({ rows: [{ one: 1 }] }));
    const health = await request(app).get("/health");
    expect(health.status).toBe(200);
    expect(health.headers["content-type"]).toMatch(/application\/json/);
    expect(health.headers["cache-control"]).toBe("no-store");
    expect(health.body).toEqual({ status: "ok" });
    expect(probe).toHaveBeenCalledExactlyOnceWith("SELECT 1");

    const root = await request(app).get("/");
    expect(root.status).toBe(200);
    expect(root.headers["content-type"]).toMatch(/text\/html/);
    expect(root.text).toContain("TTworkshop UI");
    expect(probe).toHaveBeenCalledTimes(1);
  });

  it("returns DB-backed JSON 503 on a failed probe, never 200 SPA HTML", async () => {
    const { app, probe } = productionApp(async () => { throw new Error("synthetic DB failure"); });
    const health = await request(app).get("/health");
    expect(health.status).toBe(503);
    expect(health.headers["content-type"]).toMatch(/application\/json/);
    expect(health.body).toEqual({ status: "unavailable" });
    expect(health.text).not.toContain("TTworkshop UI");
    expect(health.text).not.toContain("synthetic DB failure");
    expect(probe).toHaveBeenCalledExactlyOnceWith("SELECT 1");
  });

  it("keeps API and SPA deep-link behavior with SERVE_WEB enabled", async () => {
    const { app } = productionApp(async () => ({ rows: [{ one: 1 }] }));
    expect((await request(app).get("/api/v1/auth/me")).status).toBe(401);
    expect((await request(app).get("/api/v1/not-found")).status).toBe(404);
    const deep = await request(app).get("/workshops/42");
    expect(deep.status).toBe(200);
    expect(deep.text).toContain("TTworkshop UI");
  });

  it("does not map the retired /healthz endpoint to SPA HTML", async () => {
    const { app, probe } = productionApp(async () => ({ rows: [{ one: 1 }] }));
    const oldHealth = await request(app).get("/healthz");
    expect(oldHealth.status).toBe(404);
    expect(oldHealth.text).not.toContain("TTworkshop UI");
    expect(probe).not.toHaveBeenCalled();
  });

  it("retains JSON health without static SPA for local API-only mode", async () => {
    const { app } = productionApp(async () => ({ rows: [{ one: 1 }] }), false);
    expect((await request(app).get("/health")).body).toEqual({ status: "ok" });
    expect((await request(app).get("/")).status).toBe(404);
  });
});
