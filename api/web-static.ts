import express, { type Express } from "express";
import { join } from "node:path";

// Production Cloud Run serves the Vite build and API on a single HTTPS origin.
// No Vite dev server or extra public API endpoint is required.
export function attachWebUi(app: Express, distDirectory: string): void {
  app.use(express.static(distDirectory, { dotfiles: "deny", index: "index.html" }));
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    if (req.path === "/api" || req.path.startsWith("/api/")) return res.sendStatus(404);
    // Missing static assets must not masquerade as the SPA HTML document.
    if (req.path.split("/").at(-1)?.includes(".")) return res.sendStatus(404);
    res.sendFile(join(distDirectory, "index.html"));
  });
}
