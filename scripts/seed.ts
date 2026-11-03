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
  const hash = await hashPassword(password);
  for (const [email, role] of [
    ["participant.a@example.test", "PARTICIPANT"],
    ["participant.b@example.test", "PARTICIPANT"],
    ["organizer.a@example.test", "ORGANIZER"],
    ["organizer.b@example.test", "ORGANIZER"]
  ]) {
    await pool.query("INSERT INTO users(email,password_hash,role) VALUES($1,$2,$3) " +
      "ON CONFLICT(email) DO UPDATE SET password_hash=EXCLUDED.password_hash, role=EXCLUDED.role", [email,hash,role]);
  }
  process.stdout.write("Seeded four synthetic F-01 users (.test email domain).\n");
} finally { await pool.end(); }
