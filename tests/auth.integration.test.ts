import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { Pool } from "pg";
import { createApp } from "../api/app.js";
import { hashPassword } from "../api/password.js";
import { migrate } from "../api/migrate.js";
import { requireTestDatabaseUrl, assertTestDatabase } from "./helpers/testDatabase.js";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const origin = "http://localhost:5173";
const credentials = "synthetic-f01-password-not-for-production";
const testDatabaseUrl = requireTestDatabaseUrl(process.env.PG_TEST_URL);
const pool = new Pool({ connectionString: testDatabaseUrl });
const app = createApp(pool, { appOrigin: origin, production: false, sessionHours: 8 });

async function login(email: string, extra?: object) {
  return request(app).post("/api/v1/auth/login").set("Origin", origin)
    .send({ email, password: credentials, ...extra });
}
function sessionCookie(res: { headers: Record<string, unknown> }) {
  const cookies = res.headers["set-cookie"] as unknown as string[];
  expect(cookies).toBeDefined();
  return cookies[0]!.split(";")[0]!;
}

beforeAll(async () => {
  await assertTestDatabase(pool);
  await migrate(pool);
});
beforeEach(async () => {
  await pool.query("TRUNCATE TABLE sessions, users RESTART IDENTITY CASCADE");
  for (const [email, role] of [
    ["participant.a@example.test", "PARTICIPANT"],
    ["participant.b@example.test", "PARTICIPANT"],
    ["organizer.a@example.test", "ORGANIZER"],
    ["organizer.b@example.test", "ORGANIZER"]
  ]) {
    await pool.query("INSERT INTO users(email, password_hash, role) VALUES($1,$2,$3)",
      [email, await hashPassword(credentials), role]);
  }
});
afterAll(async () => { await pool.end(); });

describe("F-01 acceptance / actual real PostgreSQL API", () => {
  it("STS-F01-01: valid Participant login creates DB session and /me returns server identity", async () => {
    const loggedIn = await login("Participant.A@Example.Test");
    expect(loggedIn.status).toBe(200);
    expect(loggedIn.body.data.user.role).toBe("PARTICIPANT");
    expect(loggedIn.body.data.user).not.toHaveProperty("password_hash");
    const cookie = sessionCookie(loggedIn);
    expect((await pool.query("SELECT count(*)::int AS n FROM sessions")).rows[0].n).toBe(1);
    const me = await request(app).get("/api/v1/auth/me").set("Cookie", cookie);
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe("participant.a@example.test");
  });
  it("STS-F01-02: role supplied by browser cannot override stored Organizer role", async () => {
    const res = await login("organizer.a@example.test", { role: "PARTICIPANT", user_id: "forged" });
    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe("ORGANIZER");
  });
  it("STS-F01-03: unknown user and wrong password share generic 401", async () => {
    const unknown = await login("nobody@example.test");
    const wrong = await request(app).post("/api/v1/auth/login").set("Origin", origin)
      .send({ email: "participant.a@example.test", password: "incorrect" });
    expect(unknown.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(unknown.body).toEqual(wrong.body);
    expect(JSON.stringify(wrong.body)).not.toContain("participant.a");
    expect((await pool.query("SELECT count(*)::int AS n FROM sessions")).rows[0].n).toBe(0);
  });
  it("STS-F01-04: missing, revoked and expired sessions reject /me", async () => {
    expect((await request(app).get("/api/v1/auth/me")).status).toBe(401);
    const cookie = sessionCookie(await login("participant.a@example.test"));
    await pool.query("UPDATE sessions SET created_at=now()-interval '2 hours', expires_at=now()-interval '1 minute'");
    expect((await request(app).get("/api/v1/auth/me").set("Cookie",cookie)).status).toBe(401);
    const fresh = sessionCookie(await login("participant.a@example.test"));
    await pool.query("UPDATE sessions SET revoked_at=now() WHERE revoked_at IS NULL");
    expect((await request(app).get("/api/v1/auth/me").set("Cookie",fresh)).status).toBe(401);
  });
  it("STS-F01-05: role middleware forbids opposite feature endpoints without mutations", async () => {
    const participant = sessionCookie(await login("participant.a@example.test"));
    const organizer = sessionCookie(await login("organizer.a@example.test"));
    const pa = await request(app).post("/api/v1/workshops").set("Origin", origin).set("Cookie", participant).send({});
    const org = await request(app).post("/api/v1/workshops/test/registrations").set("Origin",origin).set("Cookie", organizer).send({});
    expect(pa.status).toBe(403);
    expect(org.status).toBe(403);
    expect((await pool.query("SELECT count(*)::int AS n FROM sessions")).rows[0].n).toBe(2);
    const organizerCreate = await request(app).post("/api/v1/workshops")
      .set("Origin", origin).set("Cookie", organizer).send({});
    expect(organizerCreate.status).toBe(201);
    expect(organizerCreate.body.data.status).toBe("DRAFT");
    expect((await request(app).post("/api/v1/workshops/test/registrations").set("Origin",origin).set("Cookie", participant).send({})).status).toBe(501);
  });
  it("STS-F01-06: logout revokes server session and old cookie fails /me", async () => {
    const cookie = sessionCookie(await login("participant.a@example.test"));
    const bye = await request(app).post("/api/v1/auth/logout").set("Origin",origin).set("Cookie",cookie);
    expect(bye.status).toBe(204);
    expect((await request(app).get("/api/v1/auth/me").set("Cookie",cookie)).status).toBe(401);
    expect((await pool.query("SELECT revoked_at FROM sessions")).rows[0].revoked_at).not.toBeNull();
  });
  it("STS-F01-07: hashes at rest and no credential/session contents in response", async () => {
    const row = (await pool.query("SELECT password_hash FROM users LIMIT 1")).rows[0].password_hash as string;
    expect(row).not.toContain(credentials);
    expect(row).toMatch(/^scrypt\$/);
    const loggedIn = await login("participant.a@example.test");
    expect(JSON.stringify(loggedIn.body)).not.toContain("scrypt");
    expect(JSON.stringify(loggedIn.body)).not.toContain("session");
    const cookie = sessionCookie(loggedIn);
    expect((loggedIn.headers["set-cookie"] as unknown as string[])[0]).toContain("HttpOnly");
    const stored = (await pool.query("SELECT token_hash FROM sessions")).rows[0].token_hash as string;
    expect(cookie).not.toContain(stored);
  });
  it("STS-F01-08: invalid/malformed JSON does not issue session", async () => {
    const empty = await request(app).post("/api/v1/auth/login").set("Origin", origin).send({});
    const malformed = await request(app).post("/api/v1/auth/login").set("Origin", origin).set("Content-Type","application/json").send("{");
    expect(empty.status).toBe(400);
    expect(empty.body.error.code).toBe("VALIDATION");
    expect(malformed.status).toBe(400);
    expect(malformed.headers["cache-control"]).toContain("no-store");
    expect((await pool.query("SELECT count(*)::int AS n FROM sessions")).rows[0].n).toBe(0);
  });
  it("STS-F01-07 / R-01: synthetic CLI seed generates distinct salts per account", async () => {
    execFileSync(process.execPath, ["--import", "tsx", resolve("scripts/seed.ts")], {
      cwd: resolve("."), env: { ...process.env, DATABASE_URL: testDatabaseUrl,
        SEED_PASSWORD: credentials, NODE_ENV: "test" }, stdio: "pipe"
    });
    const result = await pool.query<{ email: string; password_hash: string }>(
      "SELECT email,password_hash FROM users ORDER BY email"
    );
    expect(result.rows).toHaveLength(4);
    expect(new Set(result.rows.map(row => row.password_hash)).size).toBe(4);
    const salts = result.rows.map(row => row.password_hash.split("$")[1]);
    expect(salts.every(salt => /^[a-f0-9]{32}$/.test(salt ?? ""))).toBe(true);
    expect(new Set(salts).size).toBe(4);
    expect(result.rows.every(row => !row.password_hash.includes(credentials))).toBe(true);
  });
  it("F-01 additional security: rejected foreign Origin, bad role, unauthenticated probes", async () => {
    const foreign = await request(app).post("/api/v1/auth/login")
      .set("Origin", "https://attacker.invalid").send({email:"participant.a@example.test",password:credentials});
    expect(foreign.status).toBe(403);
    expect((await request(app).post("/api/v1/workshops").set("Origin",origin).send({})).status).toBe(401);
    await pool.query("UPDATE users SET role='ORGANIZER' WHERE email='participant.a@example.test'");
    const loginResult = await login("participant.a@example.test");
    expect(loginResult.body.data.user.role).toBe("ORGANIZER");
  });
  it("NFR-01 privacy: current-user responses are never browser/proxy cached", async () => {
    const cookie = sessionCookie(await login("participant.a@example.test"));
    const me = await request(app).get("/api/v1/auth/me").set("Cookie", cookie);
    expect(me.status).toBe(200);
    expect(me.headers["cache-control"]).toContain("no-store");
  });
});
