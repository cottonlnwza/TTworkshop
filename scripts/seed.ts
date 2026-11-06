import { Pool } from "pg";
import { hashPassword } from "../api/password.js";
import { migrate } from "../api/migrate.js";
const url = process.env.DATABASE_URL;
const password = process.env.SEED_PASSWORD;
if (!url || !password || password.length < 12) {
  throw new Error("DATABASE_URL and a synthetic SEED_PASSWORD (at least 12 chars) required");
}
if (process.env.NODE_ENV === "production") throw new Error("Never seed demo credentials in production");
const pool = new Pool({ connectionString: url });
try {
  await migrate(pool);
  for (const [email, role] of [
    ["participant.a@example.test", "PARTICIPANT"],
    ["participant.b@example.test", "PARTICIPANT"],
    ["organizer.a@example.test", "ORGANIZER"],
    ["organizer.b@example.test", "ORGANIZER"]
  ]) {
    // Every account gets its own random salt, even when using a shared synthetic demo password.
    const hash = await hashPassword(password);
    await pool.query("INSERT INTO users(email,password_hash,role) VALUES($1,$2,$3) " +
      "ON CONFLICT(email) DO UPDATE SET password_hash=EXCLUDED.password_hash, role=EXCLUDED.role", [email,hash,role]);
  }
  
  // F-02 Synthetic Workshop Seeds
  const orgARes = await pool.query("SELECT id FROM users WHERE email='organizer.a@example.test'");
  const orgAId = orgARes.rows[0].id;
  const orgBRes = await pool.query("SELECT id FROM users WHERE email='organizer.b@example.test'");
  const orgBId = orgBRes.rows[0].id;
  
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(48033402)");
    const fixtures = [
      {
        ownerId: orgAId,
        title: "F-02 Test Draft Partial",
        description: "Partial draft for testing",
        location: "Room A",
        startsAt: null,
        endsAt: null,
        capacity: null,
        status: "DRAFT"
      },
      {
        ownerId: orgAId,
        title: "F-02 Test Draft Complete",
        description: "Complete draft ready to publish",
        location: "Room B",
        startsAt: "2026-12-01T10:00:00Z",
        endsAt: "2026-12-01T12:00:00Z",
        capacity: 20,
        status: "DRAFT"
      },
      {
        ownerId: orgBId,
        title: "F-02 Test Published",
        description: "Already published workshop",
        location: "Room C",
        startsAt: "2026-12-05T09:00:00Z",
        endsAt: "2026-12-05T11:00:00Z",
        capacity: 50,
        status: "PUBLISHED"
      }
    ] as const;

    for (const fixture of fixtures) {
      const existing = await client.query(
        "SELECT id FROM workshops WHERE owner_user_id = $1 AND title = $2 LIMIT 1",
        [fixture.ownerId, fixture.title]
      );
      if (existing.rowCount) {
        process.stdout.write(`Workshop already exists: ${fixture.title}\n`);
        continue;
      }
      await client.query(
        `INSERT INTO workshops (owner_user_id, title, description, location, starts_at, ends_at, capacity, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [fixture.ownerId, fixture.title, fixture.description, fixture.location,
          fixture.startsAt, fixture.endsAt, fixture.capacity, fixture.status]
      );
      process.stdout.write(`Created workshop: ${fixture.title}\n`);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  
  process.stdout.write("Seeded four synthetic F-01 users (.test email domain).\n");
} finally { await pool.end(); }
