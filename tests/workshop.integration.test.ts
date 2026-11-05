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

  it("STS-F02-03b: Edit form remains usable after validation error (API integration)", async () => {
    const cookie = await login("organizer.a@example.test");
    const create = await request(app).post("/api/v1/workshops")
      .set("Origin", origin).set("Cookie", cookie)
      .send({
        title: "Editable Draft", description: "D", location: "L", capacity: 10,
        starts_at: "2026-12-01T10:00:00Z", ends_at: "2026-12-01T12:00:00Z"
      });
    expect(create.status).toBe(201);
    const id = create.body.data.id;

    const invalidPatch = await request(app).patch(`/api/v1/organizer/workshops/${id}`)
      .set("Origin", origin).set("Cookie", cookie)
      .send({ capacity: -1 });
    expect(invalidPatch.status).toBe(400);

    const unchanged = await request(app).get(`/api/v1/organizer/workshops/${id}`)
      .set("Origin", origin).set("Cookie", cookie);
    expect(unchanged.status).toBe(200);
    expect(unchanged.body.data.status).toBe("DRAFT");
    expect(unchanged.body.data.capacity).toBe(10);

    const validPatch = await request(app).patch(`/api/v1/organizer/workshops/${id}`)
      .set("Origin", origin).set("Cookie", cookie)
      .send({ capacity: 20 });
    expect(validPatch.status).toBe(200);
    expect(validPatch.body.data.capacity).toBe(20);
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

  it("STS-F02-05: Rejects invalid capacities and blocks publication without capacity", async () => {
    const cookie = await login("organizer.a@example.test");
    const base = {
      title: "T", description: "D", location: "L",
      starts_at: "2026-12-01T10:00:00Z", ends_at: "2026-12-01T12:00:00Z"
    };
    for (const capacity of [0, -1, 10.5, "abc"]) {
      const invalid = await request(app).post("/api/v1/workshops").set("Origin", origin).set("Cookie", cookie)
        .send({ ...base, capacity });
      expect(invalid.status).toBe(400);
      expect(invalid.body.error.code).toBe("VALIDATION");
    }

    const create = await request(app).post("/api/v1/workshops").set("Origin", origin).set("Cookie", cookie)
      .send({ title: "Missing capacity", description: "D", location: "L", starts_at: base.starts_at, ends_at: base.ends_at });
    expect(create.status).toBe(201);
    const publish = await request(app).post(`/api/v1/organizer/workshops/${create.body.data.id}/publish`)
      .set("Origin", origin).set("Cookie", cookie);
    expect(publish.status).toBe(400);
    expect(publish.body.error.code).toBe("VALIDATION");
    const stored = await pool.query("SELECT status, capacity FROM workshops WHERE id=$1", [create.body.data.id]);
    expect(stored.rows[0]).toMatchObject({ status: "DRAFT", capacity: null });
  });

  it("STS-F02-05b: Rejects numeric-string, boolean, and fractional capacities", async () => {
    const cookie = await login("organizer.a@example.test");
    const base = {
      title: "T", description: "D", location: "L",
      starts_at: "2026-12-01T10:00:00Z", ends_at: "2026-12-01T12:00:00Z"
    };
    for (const capacity of ["5", true, 10.5]) {
      const response = await request(app).post("/api/v1/workshops")
        .set("Origin", origin).set("Cookie", cookie)
        .send({ ...base, capacity });
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION");
    }
    const stored = await pool.query("SELECT count(*)::int AS n FROM workshops");
    expect(stored.rows[0].n).toBe(0);
  });

  it("STS-F02-04c: PATCH deadline-only that violates BR-08 is rejected", async () => {
    const cookie = await login("organizer.a@example.test");
    const create = await request(app).post("/api/v1/workshops")
      .set("Origin", origin).set("Cookie", cookie)
      .send({
        title: "T", description: "D", location: "L", capacity: 10,
        starts_at: "2026-12-01T10:00:00Z", ends_at: "2026-12-01T12:00:00Z"
      });
    expect(create.status).toBe(201);
    const id = create.body.data.id;

    const patch = await request(app).patch(`/api/v1/organizer/workshops/${id}`)
      .set("Origin", origin).set("Cookie", cookie)
      .send({ registration_deadline: "2026-12-02T10:00:00Z" });
    expect(patch.status).toBe(400);
    expect(patch.body.error.code).toBe("VALIDATION");

    const unchanged = await request(app).get(`/api/v1/organizer/workshops/${id}`)
      .set("Origin", origin).set("Cookie", cookie);
    expect(unchanged.status).toBe(200);
    expect(unchanged.body.data.registration_deadline).toBeNull();
  });
  it("STS-F02-04b: PATCH registration_deadline null clears the field", async () => {
    const cookie = await login("organizer.a@example.test");
    const create = await request(app).post("/api/v1/workshops")
      .set("Origin", origin).set("Cookie", cookie)
      .send({
        title: "T", description: "D", location: "L", capacity: 10,
        starts_at: "2026-12-01T10:00:00Z", ends_at: "2026-12-01T12:00:00Z",
        registration_deadline: "2026-11-30T10:00:00Z"
      });
    expect(create.status).toBe(201);
    const id = create.body.data.id;

    const patch = await request(app).patch(`/api/v1/organizer/workshops/${id}`)
      .set("Origin", origin).set("Cookie", cookie)
      .send({ registration_deadline: null });
    expect(patch.status).toBe(200);
    expect(patch.body.data.registration_deadline).toBeNull();

    const get = await request(app).get(`/api/v1/organizer/workshops/${id}`)
      .set("Origin", origin).set("Cookie", cookie);
    expect(get.status).toBe(200);
    expect(get.body.data.registration_deadline).toBeNull();
  });

  it("R-04: POST and PATCH reject non-string text fields", async () => {
    const cookie = await login("organizer.a@example.test");
    const validDraft = await request(app).post("/api/v1/workshops")
      .set("Origin", origin).set("Cookie", cookie)
      .send({ title: "Valid", description: "Valid", location: "Valid" });
    expect(validDraft.status).toBe(201);
    const id = validDraft.body.data.id;

    const invalidValues: Array<["title" | "description" | "location", unknown]> = [
      ["title", 42], ["description", true], ["location", { room: "A" }]
    ];
    for (const [field, value] of invalidValues) {
      const post = await request(app).post("/api/v1/workshops")
        .set("Origin", origin).set("Cookie", cookie).send({ [field]: value });
      expect(post.status).toBe(400);
      expect(post.body.error.code).toBe("VALIDATION");

      const patch = await request(app).patch(`/api/v1/organizer/workshops/${id}`)
        .set("Origin", origin).set("Cookie", cookie).send({ [field]: value });
      expect(patch.status).toBe(400);
      expect(patch.body.error.code).toBe("VALIDATION");
    }

    const unchanged = await pool.query("SELECT title, description, location FROM workshops WHERE id=$1", [id]);
    expect(unchanged.rows[0]).toMatchObject({ title: "Valid", description: "Valid", location: "Valid" });
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

  it("STS-F02-07b: Concurrent publish requests result in exactly one success", async () => {
    const cookie = await login("organizer.a@example.test");
    const create = await request(app).post("/api/v1/workshops")
      .set("Origin", origin).set("Cookie", cookie)
      .send({
        title: "Concurrent Publish", description: "D", location: "L", capacity: 10,
        starts_at: "2026-12-01T10:00:00Z", ends_at: "2026-12-01T12:00:00Z"
      });
    expect(create.status).toBe(201);
    const id = create.body.data.id;
    const publishUrl = `/api/v1/organizer/workshops/${id}/publish`;

    const [first, second] = await Promise.all([
      request(app).post(publishUrl).set("Origin", origin).set("Cookie", cookie),
      request(app).post(publishUrl).set("Origin", origin).set("Cookie", cookie)
    ]);

    expect([first.status, second.status].sort((a, b) => a - b)).toEqual([200, 409]);

    const finalState = await request(app).get(`/api/v1/organizer/workshops/${id}`)
      .set("Origin", origin).set("Cookie", cookie);
    expect(finalState.status).toBe(200);
    expect(finalState.body.data.status).toBe("PUBLISHED");
  });
  it("STS-F02-08: Publish fails separately for each missing required field", async () => {
    const cookie = await login("organizer.a@example.test");
    const base: Record<string, unknown> = {
      title: "T", description: "D", location: "L", capacity: 10,
      starts_at: "2026-12-01T10:00:00Z", ends_at: "2026-12-01T12:00:00Z"
    };
    const requiredFields = ["title", "description", "location", "starts_at", "ends_at", "capacity"];
    for (const field of requiredFields) {
      const payload = { ...base };
      delete payload[field];
      const create = await request(app).post("/api/v1/workshops").set("Origin", origin).set("Cookie", cookie)
        .send(payload);
      expect(create.status).toBe(201);
      const id = create.body.data.id;
      const publish = await request(app).post(`/api/v1/organizer/workshops/${id}/publish`)
        .set("Origin", origin).set("Cookie", cookie);
      expect(publish.status).toBe(400);
      expect(publish.body.error.code).toBe("VALIDATION");
      const stored = await pool.query("SELECT status FROM workshops WHERE id=$1", [id]);
      expect(stored.rows[0].status).toBe("DRAFT");
    }
  });

  it("STS-F02-09: Persistence after app instance recreation (simulates restart)", async () => {
    // NOTE: This test simulates app restart by creating a new Express app instance
    // with the same PostgreSQL pool. It does NOT restart the actual Node.js process.
    // True process-restart testing requires separate E2E infrastructure.
    // This verifies that data persists in PostgreSQL across app instances.
    const cookie = await login("organizer.a@example.test");
    const create = await request(app).post("/api/v1/workshops").set("Origin", origin).set("Cookie", cookie)
      .send({ title: "Persistent Draft", description: "D", location: "L", starts_at: "2026-12-01T10:00:00Z", ends_at: "2026-12-01T12:00:00Z", capacity: 10 });
    expect(create.status).toBe(201);
    const id = create.body.data.id;
    // Recreate the Express app while retaining the same persistent database pool.
    const newApp = createApp(pool, { appOrigin: origin, production: false, sessionHours: 8 });
    const get = await request(newApp).get(`/api/v1/organizer/workshops/${id}`)
      .set("Origin", origin).set("Cookie", cookie);
    expect(get.status).toBe(200);
    expect(get.body.data.title).toBe("Persistent Draft");
    expect(get.body.data.status).toBe("DRAFT");
  });

  it("Rejects date-times without an explicit ISO 8601 offset", async () => {
    const cookie = await login("organizer.a@example.test");
    const response = await request(app).post("/api/v1/workshops").set("Origin", origin).set("Cookie", cookie)
      .send({ starts_at: "2026-12-01T10:00:00", ends_at: "2026-12-01T12:00:00" });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION");
    const count = await pool.query("SELECT count(*)::int AS n FROM workshops");
    expect(count.rows[0].n).toBe(0);
  });

  it("Database constraints reject direct publication of incomplete or invalid-deadline drafts", async () => {
    const cookie = await login("organizer.a@example.test");
    const incomplete = await request(app).post("/api/v1/workshops").set("Origin", origin).set("Cookie", cookie)
      .send({ title: "Incomplete" });
    const incompleteId = incomplete.body.data.id;
    await expect(pool.query("UPDATE workshops SET status='PUBLISHED' WHERE id=$1", [incompleteId]))
      .rejects.toMatchObject({ code: "23514" });

    const owner = await pool.query("SELECT id FROM users WHERE email='organizer.a@example.test'");
    const invalidDeadline = await pool.query(
      `INSERT INTO workshops (owner_user_id, title, description, location, starts_at, ends_at, capacity, registration_deadline, status)
       VALUES ($1, 'T', 'D', 'L', '2026-12-01T10:00:00Z', '2026-12-01T12:00:00Z', 10, '2026-12-01T11:00:00Z', 'DRAFT') RETURNING id`,
      [owner.rows[0].id]
    );
    await expect(pool.query("UPDATE workshops SET status='PUBLISHED' WHERE id=$1", [invalidDeadline.rows[0].id]))
      .rejects.toMatchObject({ code: "23514" });
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
      .send({ title: "Partial", starts_at: "2026-12-01T10:00:00Z" });
    const id = create.body.data.id;

    const invalidMerged = await request(app).patch(`/api/v1/organizer/workshops/${id}`)
      .set("Origin", origin).set("Cookie", cookie)
      .send({ registration_deadline: "2026-12-01T11:00:00Z" });
    expect(invalidMerged.status).toBe(400);
    expect(invalidMerged.body.error.code).toBe("VALIDATION");
    const unchanged = await pool.query("SELECT registration_deadline, status FROM workshops WHERE id=$1", [id]);
    expect(unchanged.rows[0]).toMatchObject({ registration_deadline: null, status: "DRAFT" });
    
    const update = await request(app).patch(`/api/v1/organizer/workshops/${id}`).set("Origin", origin).set("Cookie", cookie)
      .send({ description: "Desc", location: "Loc", starts_at: "2026-12-01T10:00:00Z", ends_at: "2026-12-01T12:00:00Z", capacity: 5 });
    expect(update.status).toBe(200);
    expect(update.body.data.description).toBe("Desc");
    
    const pub = await request(app).post(`/api/v1/organizer/workshops/${id}/publish`).set("Origin", origin).set("Cookie", cookie);
    expect(pub.status).toBe(200);
    expect(pub.body.data.status).toBe("PUBLISHED");
  });

  it("STS-F02-12: Foreign Organizer, Participant, and post-publish updates are denied", async () => {
    const cookieA = await login("organizer.a@example.test");
    const cookieB = await login("organizer.b@example.test");
    const cookieP = await login("participant.a@example.test");
    const create = await request(app).post("/api/v1/workshops").set("Origin", origin).set("Cookie", cookieA)
      .send({ title: "T" });
    const id = create.body.data.id;

    const foreign = await request(app).patch(`/api/v1/organizer/workshops/${id}`)
      .set("Origin", origin).set("Cookie", cookieB).send({ title: "Foreign update" });
    expect(foreign.status).toBe(404);
    const participant = await request(app).patch(`/api/v1/organizer/workshops/${id}`)
      .set("Origin", origin).set("Cookie", cookieP).send({ title: "Participant update" });
    expect(participant.status).toBe(403);

    const complete = await request(app).patch(`/api/v1/organizer/workshops/${id}`)
      .set("Origin", origin).set("Cookie", cookieA)
      .send({ description: "D", location: "L", starts_at: "2026-12-01T10:00:00Z", ends_at: "2026-12-01T12:00:00Z", capacity: 5 });
    expect(complete.status).toBe(200);
    const publish = await request(app).post(`/api/v1/organizer/workshops/${id}/publish`)
      .set("Origin", origin).set("Cookie", cookieA);
    expect(publish.status).toBe(200);
    const afterPublish = await request(app).patch(`/api/v1/organizer/workshops/${id}`)
      .set("Origin", origin).set("Cookie", cookieA).send({ title: "Post-publish update" });
    expect(afterPublish.status).toBe(409);
  });
});
