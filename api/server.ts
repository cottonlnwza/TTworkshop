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
app.listen(port, "127.0.0.1", () => {
  process.stdout.write("F-01 API listening on localhost:" + port + "\n");
});
