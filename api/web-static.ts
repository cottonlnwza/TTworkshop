import express, { type Express } from "express";
import { join } from "node:path";

type HealthDb = { query(sql: string): Promise<unknown> };

/** Register health before the SPA fallback in both production and local mode. */
export function attachDeploymentRoutes(
  app: Express,
  db: HealthDb,
  options: { serveWeb: boolean; distDirectory: string }
): void {
  app.get("/healthz", async (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    try {
      await db.query("SELECT 1");
      res.status(200).json({ status: "ok" });
    } catch {
      res.status(503).json({ status: "unavailable" });
    }
  });
  if (options.serveWeb) attachWebUi(app, options.distDirectory);
}

// Production Cloud Run serves the Vite build and API on a single HTTPS origin.
// No Vite dev server or extra public API endpoint is required.
export function attachWebUi(app: Express, distDirectory: string): void {
  app.use(express.static(distDirectory, { dotfiles: "deny", index: "index.html" }));
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    if (req.path === "/api" || req.path.startsWith("/api/")) return res.sendStatus(404);
    // Never turn a missing/misconfigured database readiness handler into HTML.
    if (req.path === "/healthz") return next();
    // Missing static assets must not masquerade as the SPA HTML document.
    if (req.path.split("/").at(-1)?.includes(".")) return res.sendStatus(404);
    res.sendFile(join(distDirectory, "index.html"));
  });
}
