/** Run ONLY in a separately reviewed Cloud Run Job with DATABASE_URL secret injection. */
import { Pool } from "pg";
import { verifyCloudDbConnection } from "../api/cloud-db-check.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  process.stderr.write("CLOUD_DB_CHECK_FAIL: database secret not injected\n");
  process.exitCode = 1;
} else {
  const pool = new Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 8000, max: 1 });
  try {
    // Cloud Run Job config must explicitly select migrator identity when using
    // the separate migration-only Secret. Default stays the runtime login.
    await verifyCloudDbConnection(pool, process.env.CLOUD_DB_EXPECTED_USER);
    process.stdout.write("CLOUD_DB_CHECK_PASS: read-only PostgreSQL connection/identity\n");
  } catch {
    // Deliberately suppress raw driver errors, which can include connection details.
    process.stderr.write("CLOUD_DB_CHECK_FAIL: database unavailable or identity mismatch (details redacted)\n");
    process.exitCode = 1;
  } finally {
    try {
      await pool.end();
    } catch {
      // Even a pool close error can contain driver/connection diagnostics.
      process.stderr.write("CLOUD_DB_CHECK_FAIL: could not close database connection\n");
      process.exitCode = 1;
    }
  }
}
