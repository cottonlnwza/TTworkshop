import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Pool } from "pg";
import { migrate } from "../api/migrate.js";
import { prepareDatabaseOnStartup } from "../api/runtime-schema.js";
import { assertTestDatabase, requireTestDatabaseUrl } from "./helpers/testDatabase.js";

/**
 * A disposable, synthetic role models the proposed runtime DML-only grants.
 * It is NEVER created on Cloud SQL: the test helper requires an exact-named
 * dedicated database and a genuine loopback PostgreSQL server.
 */
const pool = new Pool({ connectionString: requireTestDatabaseUrl(process.env.PG_TEST_URL) });
const role = "ttworkshop_runtime_contract_test";
let roleCreated = false;

beforeAll(async () => {
  await assertTestDatabase(pool);
  await migrate(pool);
  await pool.query(`CREATE ROLE ${role} NOLOGIN`);
  roleCreated = true;
  await pool.query(`GRANT USAGE ON SCHEMA public TO ${role}`);
  await pool.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.users, public.sessions, public.workshops, public.registrations TO ${role}`);
  await pool.query(`GRANT SELECT ON TABLE public.schema_migrations TO ${role}`);
  await pool.query(`GRANT USAGE, SELECT ON SEQUENCE public.users_id_seq, public.sessions_id_seq, public.workshops_id_seq, public.registrations_id_seq TO ${role}`);
});

afterAll(async () => {
  if (roleCreated) {
    // Revoke test-only grants/role; no changes outside ttworkshop_test.
    await pool.query(`DROP OWNED BY ${role}`);
    await pool.query(`DROP ROLE ${role}`);
  }
  await pool.end();
});

describe("AC-L5-13: proposed runtime privileges in isolated PostgreSQL", () => {
  it("can read migration history and start the app without performing DDL", async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`SET LOCAL ROLE ${role}`);
      const performMigration = vi.fn(async () => { throw new Error("Runtime migration forbidden"); });
      await prepareDatabaseOnStartup(client as never, true, performMigration);
      expect(performMigration).not.toHaveBeenCalled();
      const { rows } = await client.query(`SELECT
        current_user AS current_role,
        has_schema_privilege(current_user, 'public', 'CREATE') AS can_create_object,
        has_table_privilege(current_user, 'public.workshops', 'INSERT') AS can_insert_workshops,
        has_table_privilege(current_user, 'public.schema_migrations', 'INSERT') AS can_write_migration_history,
        has_sequence_privilege(current_user, 'public.workshops_id_seq', 'USAGE') AS can_use_workshop_sequence`);
      expect(rows).toEqual([{
        current_role: role,
        can_create_object: false,
        can_insert_workshops: true,
        can_write_migration_history: false,
        can_use_workshop_sequence: true,
      }]);
      await client.query("ROLLBACK");
    } finally {
      client.release();
    }
  });

  it("rejects both runtime DDL and writes to migration bookkeeping", async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`SET LOCAL ROLE ${role}`);
      await client.query("SAVEPOINT disallow_ddl");
      await expect(client.query("CREATE TABLE public.forbidden_runtime_ddl (id integer)")).rejects.toMatchObject({ code: "42501" });
      await client.query("ROLLBACK TO SAVEPOINT disallow_ddl");
      await client.query("SAVEPOINT disallow_history_write");
      await expect(client.query("INSERT INTO public.schema_migrations(filename) VALUES('forbidden.sql')")).rejects.toMatchObject({ code: "42501" });
      await client.query("ROLLBACK TO SAVEPOINT disallow_history_write");
      await client.query("ROLLBACK");
    } finally {
      client.release();
    }
  });
});
