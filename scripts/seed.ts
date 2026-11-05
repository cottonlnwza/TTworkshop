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
  
  await pool.query(`
    INSERT INTO workshops (owner_user_id, title, description, location, starts_at, ends_at, capacity, status)
    VALUES 
      ($1, 'F-02 Test Draft Partial', 'Partial draft for testing', 'Room A', NULL, NULL, NULL, 'DRAFT'),
      ($1, 'F-02 Test Draft Complete', 'Complete draft ready to publish', 'Room B', '2026-12-01T10:00:00Z', '2026-12-01T12:00:00Z', 20, 'DRAFT'),
      ($2, 'F-02 Test Published', 'Already published workshop', 'Room C', '2026-12-05T09:00:00Z', '2026-12-05T11:00:00Z', 50, 'PUBLISHED')
  `, [orgAId, orgBId]);
  
  process.stdout.write("Seeded four synthetic F-01 users (.test email domain).\n");
  process.stdout.write("Seeded three synthetic F-02 workshops (2 DRAFT, 1 PUBLISHED).\n");
} finally { await pool.end(); }
