import { Pool } from "pg";
import { createApp } from "./app.js";
import { migrate } from "./migrate.js";
const databaseUrl = process.env.DATABASE_URL;
const appOrigin = process.env.APP_ORIGIN;
if (!databaseUrl || !appOrigin) throw new Error("DATABASE_URL and APP_ORIGIN are required");
const production = process.env.NODE_ENV === "production";
if (production && !appOrigin.startsWith("https://")) throw new Error("APP_ORIGIN must be HTTPS in production");
const pool = new Pool({ connectionString: databaseUrl });
await migrate(pool);
const app = createApp(pool, { appOrigin, production, sessionHours: 8 });
const port = Number(process.env.PORT ?? 3000);
const host = process.env.APP_HOST ?? "127.0.0.1";
if (!["127.0.0.1", "0.0.0.0"].includes(host)) {
  throw new Error("APP_HOST must be 127.0.0.1 or 0.0.0.0");
}
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be a valid TCP port");
app.get("/healthz", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({ status: "ok" });
  } catch {
    res.status(503).json({ status: "unavailable" });
  }
});
app.listen(port, host, () => {
  // Preserve the existing local startup marker used by real API-process
  // restart integration tests; container logging names its explicit host.
  process.stdout.write(host === "127.0.0.1"
    ? `F-01 API listening on localhost:${port}\n`
    : `API listening on ${host}:${port}\n`);
});
