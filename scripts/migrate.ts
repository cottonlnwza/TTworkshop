import { Pool } from "pg";
import { migrate } from "../api/migrate.js";
const url = process.env.DATABASE_URL;
if (!url) {
  process.stderr.write("DB_MIGRATE_FAIL: migration credential not supplied\n");
  process.exitCode = 1;
} else {
  const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 8000 });
  try {
    await migrate(pool);
    process.stdout.write("DB_MIGRATE_PASS: versioned database migrations applied\n");
  } catch {
    // pg driver errors can contain connection strings. Never put them in logs.
    process.stderr.write("DB_MIGRATE_FAIL: schema migration rejected (details redacted)\n");
    process.exitCode = 1;
  } finally {
    try {
      await pool.end();
    } catch {
      process.stderr.write("DB_MIGRATE_FAIL: could not close migration connection\n");
      process.exitCode = 1;
    }
  }
}
