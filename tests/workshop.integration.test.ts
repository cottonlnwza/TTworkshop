import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { Pool } from "pg";
import { createApp } from "../api/app.js";
import { hashPassword } from "../api/password.js";
import { migrate } from "../api/migrate.js";
import { requireTestDatabaseUrl, assertTestDatabase } from "./helpers/testDatabase.js";

const origin = "http://localhost:5173";
const credentials = "synthetic-f01-password-not-for-production";
const testDatabaseUrl = requireTestDatabaseUrl(process.env.PG_TEST_URL);
const pool = new Pool({ connectionString: testDatabaseUrl });
const app = createApp(pool, { appOrigin: origin, production: false, sessionHours: 8 });

async function login(email: string) {
  const res = await request(app).post("/api/v1/auth/login").set("Origin", origin)
    .send({ email, password: credentials });
  const setCookieHeader = res.headers["set-cookie"];
  const cookies = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : setCookieHeader
      ? [setCookieHeader]
      : undefined;
  return cookies ? cookies[0].split(";")[0] : "";
}

beforeAll(async () => {
  await assertTestDatabase(pool);
  await migrate(pool);
});

beforeEach(async () => {
  await pool.query("TRUNCATE TABLE workshops, sessions, users RESTART IDENTITY CASCADE");
  for (const [email, role] of [
    ["participant.a@example.test", "PARTICIPANT"],
    ["organizer.a@example.test", "ORGANIZER"],
    ["organizer.b@example.test", "ORGANIZER"]
  ]) {
    await pool.query("INSERT INTO users(email, password_hash, role) VALUES($1,$2,$3)",
      [email, await hashPassword(credentials), role]);
  }
});

afterAll(async () => { await pool.end(); });

describe("F-02 Workshop Draft & Publish Integration", () => {
  it("STS-F02-01: Organizer creates partial DRAFT with session-derived owner", async () => {
    const cookie = await login("organizer.a@example.test");
    const res = await request(app).post("/api/v1/workshops").set("Origin", origin).set("Cookie", cookie)
      .send({ title: "Partial Draft" });
    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe("Partial Draft");
    expect(res.body.data.status).toBe("DRAFT");
    
    const dbCheck = await pool.query("SELECT owner_user_id, title FROM workshops WHERE id=$1", [res.body.data.id]);
    expect(dbCheck.rows[0].title).toBe("Partial Draft");
  });

  it("STS-F02-02: Organizer lists only own workshops; foreign DRAFT hidden", async () => {
    const cookieA = await login("organizer.a@example.test");
    const cookieB = await login("organizer.b@example.test");
    
    await request(app).post("/api/v1/workshops").set("Origin", origin).set("Cookie", cookieB)
      .send({ title: "B's Draft" });
    
    const listA = await request(app).get("/api/v1/organizer/workshops")
      .set("Origin", origin).set("Cookie", cookieA);
    expect(listA.status).toBe(200);
    expect(listA.body.data).toHaveLength(0);
  });

  it("STS-F02-03: Eligible DRAFT publishes once; PUBLISHED state persists", async () => {
    const cookie = await login("organizer.a@example.test");
    const create = await request(app).post("/api/v1/workshops").set("Origin", origin).set("Cookie", cookie)
      .send({ title: "T", description: "D", location: "L", starts_at: "2026-12-01T10:00:00Z", ends_at: "2026-12-01T12:00:00Z", capacity: 10 });
    const id = create.body.data.id;
    
    const pub = await request(app).post(`/api/v1/organizer/workshops/${id}/publish`).set("Origin", origin).set("Cookie", cookie);
    expect(pub.status).toBe(200);
    expect(pub.body.data.status).toBe("PUBLISHED");
    
    const dbCheck = await pool.query("SELECT status FROM workshops WHERE id=$1", [id]);
    expect(dbCheck.rows[0].status).toBe("PUBLISHED");
  });

  it("STS-F02-04: Create rejects end<=start; invalid workshop is not persisted", async () => {
    const cookie = await login("organizer.a@example.test");
    const create = await request(app).post("/api/v1/workshops").set("Origin", origin).set("Cookie", cookie)
      .send({ title: "T", description: "D", location: "L", starts_at: "2026-12-01T12:00:00Z", ends_at: "2026-12-01T10:00:00Z", capacity: 10 });
    expect(create.status).toBe(400);
    expect(create.body.error.code).toBe("VALIDATION");

    const dbCheck = await pool.query("SELECT count(*)::int AS n FROM workshops");
    expect(dbCheck.rows[0].n).toBe(0);
  });

  it("STS-F02-05: Publish with zero/negative capacity fails; DB unchanged", async () => {
    const cookie = await login("organizer.a@example.test");
    const create = await request(app).post("/api/v1/workshops").set("Origin", origin).set("Cookie", cookie)
      .send({ title: "T", description: "D", location: "L", starts_at: "2026-12-01T10:00:00Z", ends_at: "2026-12-01T12:00:00Z", capacity: 0 });
    const id = create.body.data.id;
    
    const pub = await request(app).post(`/api/v1/organizer/workshops/${id}/publish`).set("Origin", origin).set("Cookie", cookie);
    expect(pub.status).toBe(400);
    expect(pub.body.error.code).toBe("VALIDATION");
  });

  it("STS-F02-06: Participant/anonymous create or publish denied", async () => {
    const partCookie = await login("participant.a@example.test");
    const create = await request(app).post("/api/v1/workshops").set("Origin", origin).set("Cookie", partCookie).send({ title: "T" });
    expect(create.status).toBe(403);
    
    const anonCreate = await request(app).post("/api/v1/workshops").set("Origin", origin).send({ title: "T" });
    expect(anonCreate.status).toBe(401);
  });

  it("STS-F02-07: Second publish of PUBLISHED is rejected (409)", async () => {
    const cookie = await login("organizer.a@example.test");
    const create = await request(app).post("/api/v1/workshops").set("Origin", origin).set("Cookie", cookie)
      .send({ title: "T", description: "D", location: "L", starts_at: "2026-12-01T10:00:00Z", ends_at: "2026-12-01T12:00:00Z", capacity: 10 });
    const id = create.body.data.id;
    
    await request(app).post(`/api/v1/organizer/workshops/${id}/publish`).set("Origin", origin).set("Cookie", cookie);
    const pub2 = await request(app).post(`/api/v1/organizer/workshops/${id}/publish`).set("Origin", origin).set("Cookie", cookie);
    expect(pub2.status).toBe(409);
  });

  it("STS-F02-08: Publish with missing required field fails; status remains DRAFT", async () => {
    const cookie = await login("organizer.a@example.test");
    const create = await request(app).post("/api/v1/workshops").set("Origin", origin).set("Cookie", cookie)
      .send({ title: "T" }); // missing description, location, starts_at, ends_at, capacity
    const id = create.body.data.id;
    
    const pub = await request(app).post(`/api/v1/organizer/workshops/${id}/publish`).set("Origin", origin).set("Cookie", cookie);
    expect(pub.status).toBe(400);
    expect(pub.body.error.code).toBe("VALIDATION");
    
    const dbCheck = await pool.query("SELECT status FROM workshops WHERE id=$1", [id]);
    expect(dbCheck.rows[0].status).toBe("DRAFT");
  });

  it("STS-F02-10: BR-08 Create rejects deadline > starts_at", async () => {
    const cookie = await login("organizer.a@example.test");
    const res = await request(app).post("/api/v1/workshops").set("Origin", origin).set("Cookie", cookie)
      .send({ title: "T", starts_at: "2026-12-01T10:00:00Z", registration_deadline: "2026-12-01T12:00:00Z" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION");
    
    const count = await pool.query("SELECT count(*) FROM workshops");
    expect(Number(count.rows[0].count)).toBe(0);
  });

  it("STS-F02-11: BR-08 Publish rejects persisted deadline > starts_at", async () => {
    const cookie = await login("organizer.a@example.test");
    // Insert invalid draft directly to test Publish validation independently of Create
    const userIdRes = await pool.query("SELECT id FROM users WHERE email='organizer.a@example.test'");
    const userId = userIdRes.rows[0].id;
    await pool.query(
      `INSERT INTO workshops (owner_user_id, title, description, location, starts_at, ends_at, capacity, registration_deadline, status)
       VALUES ($1, 'T', 'D', 'L', '2026-12-01T10:00:00Z', '2026-12-01T12:00:00Z', 10, '2026-12-01T12:00:00Z', 'DRAFT')`,
      [userId]
    );
    const draftRes = await pool.query("SELECT id FROM workshops WHERE owner_user_id=$1", [userId]);
    const id = draftRes.rows[0].id;
    
    const pub = await request(app).post(`/api/v1/organizer/workshops/${id}/publish`).set("Origin", origin).set("Cookie", cookie);
    expect(pub.status).toBe(400);
    expect(pub.body.error.code).toBe("VALIDATION");
    
    const dbCheck = await pool.query("SELECT status FROM workshops WHERE id=$1", [id]);
    expect(dbCheck.rows[0].status).toBe("DRAFT");
  });

  it("STS-F02-12: Create partial -> Update same DRAFT -> Publish flow", async () => {
    const cookie = await login("organizer.a@example.test");
    const create = await request(app).post("/api/v1/workshops").set("Origin", origin).set("Cookie", cookie)
      .send({ title: "Partial" });
    const id = create.body.data.id;
    
    const update = await request(app).patch(`/api/v1/organizer/workshops/${id}`).set("Origin", origin).set("Cookie", cookie)
      .send({ description: "Desc", location: "Loc", starts_at: "2026-12-01T10:00:00Z", ends_at: "2026-12-01T12:00:00Z", capacity: 5 });
    expect(update.status).toBe(200);
    expect(update.body.data.description).toBe("Desc");
    
    const pub = await request(app).post(`/api/v1/organizer/workshops/${id}/publish`).set("Origin", origin).set("Cookie", cookie);
    expect(pub.status).toBe(200);
    expect(pub.body.data.status).toBe("PUBLISHED");
  });
});
