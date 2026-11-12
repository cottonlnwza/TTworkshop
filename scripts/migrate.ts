import { Pool } from "pg";
import { migrate } from "../api/migrate.js";
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL required");
const pool = new Pool({ connectionString: url });
try {
  await migrate(pool);
  process.stdout.write("Database migrations applied\n");
} finally { await pool.end(); }
