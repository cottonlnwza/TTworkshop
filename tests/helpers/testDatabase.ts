import type { Pool } from "pg";

/**
 * Refuse to connect to, migrate, or truncate anything but a dedicated local
 * test database. In particular, a query parameter containing "ttworkshop_test"
 * must never authorize a connection to a different database.
 */
export function requireTestDatabaseUrl(raw: string | undefined): string {
  if (!raw) throw new Error("PG_TEST_URL must name dedicated local ttworkshop_test");
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("PG_TEST_URL is not a valid PostgreSQL URL");
  }
  const permittedHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
  if (!["postgresql:", "postgres:"].includes(url.protocol) ||
      !permittedHosts.has(url.hostname) ||
      url.pathname !== "/ttworkshop_test") {
    throw new Error("PG_TEST_URL must use the exact local ttworkshop_test database");
  }
  return raw;
}

/** Verify the actual database selected by PostgreSQL before any destructive SQL. */
export async function assertTestDatabase(pool: Pool): Promise<void> {
  const result = await pool.query<{ database_name: string; server_ip: string | null }>(
    "SELECT current_database() AS database_name, host(inet_server_addr()) AS server_ip"
  );
  const row = result.rows[0];
  if (!row || row.database_name !== "ttworkshop_test" ||
      !["127.0.0.1", "::1"].includes(row.server_ip ?? "")) {
    throw new Error("Refusing destructive tests: database name or loopback server mismatch");
  }
}

/** Require the dedicated local database used only by seed idempotency tests. */
export function requireSeedTestDatabaseUrl(raw: string | undefined): string {
  if (!raw) {
    throw new Error("PG_SEED_TEST_URL must name dedicated local ttworkshop_seed_test");
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("PG_SEED_TEST_URL is not a valid PostgreSQL URL");
  }
  const permittedHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
  if (
    !["postgresql:", "postgres:"].includes(url.protocol) ||
    !permittedHosts.has(url.hostname) ||
    url.pathname !== "/ttworkshop_seed_test"
  ) {
    throw new Error(
      "PG_SEED_TEST_URL must use the exact local ttworkshop_seed_test database"
    );
  }
  return raw;
}

/** Verify the actual seed-test database and loopback server before SQL mutations. */
export async function assertSeedTestDatabase(pool: Pool): Promise<void> {
  const result = await pool.query<{ database_name: string; server_ip: string | null }>(
    "SELECT current_database() AS database_name, host(inet_server_addr()) AS server_ip"
  );
  const row = result.rows[0];
  if (
    !row ||
    row.database_name !== "ttworkshop_seed_test" ||
    !["127.0.0.1", "::1"].includes(row.server_ip ?? "")
  ) {
    throw new Error(
      "Refusing seed idempotency tests: database name or loopback server mismatch"
    );
  }
}
