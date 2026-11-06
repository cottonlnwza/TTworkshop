import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer as createNetServer } from "node:net";
import { resolve } from "node:path";
import request from "supertest";
import { Pool } from "pg";
import { createApp } from "../api/app.js";
import { hashPassword } from "../api/password.js";
import { migrate } from "../api/migrate.js";
import { requireTestDatabaseUrl, assertTestDatabase } from "./helpers/testDatabase.js";

const origin = "http://localhost:5173";
const password = "synthetic-f03-password-not-for-production";
const databaseUrl = requireTestDatabaseUrl(process.env.PG_TEST_URL);
const pool = new Pool({ connectionString: databaseUrl });
let currentTime = new Date();
const app = createApp(pool, { appOrigin: origin, production: false, sessionHours: 8, now: () => currentTime });
const participantEmails = Array.from({ length: 10 }, (_, i) => `participant.${i + 1}@example.test`);

async function login(email: string): Promise<string> {
  const response = await request(app).post("/api/v1/auth/login").set("Origin", origin)
    .send({ email, password });
  expect(response.status).toBe(200);
  const header = response.headers["set-cookie"];
  const values = Array.isArray(header) ? header : header ? [header] : [];
  return values[0]?.split(";")[0] ?? "";
}

async function seedWorkshop(options: {
  status?: "DRAFT" | "PUBLISHED";
  capacity?: number;
  startsAt?: Date;
  endsAt?: Date;
  deadline?: Date | null;
} = {}): Promise<string> {
  const organizer = await pool.query("SELECT id FROM users WHERE email='organizer@example.test'");
  const startsAt = options.startsAt ?? new Date(Date.now() + 60 * 60 * 1000);
  const endsAt = options.endsAt ?? new Date(startsAt.getTime() + 60 * 60 * 1000);
  const result = await pool.query(
    `INSERT INTO workshops
      (owner_user_id,title,description,location,starts_at,ends_at,capacity,registration_deadline,status)
     VALUES ($1,'F03 Workshop','Synthetic F03 fixture','Room F03',$2,$3,$4,$5,$6)
     RETURNING id`,
    [organizer.rows[0].id, startsAt, endsAt, options.capacity ?? 10,
      options.deadline === undefined ? null : options.deadline, options.status ?? "PUBLISHED"]
  );
  return String(result.rows[0].id);
}

async function reservePort(): Promise<number> {
  const server = createNetServer();
  await new Promise<void>((resolvePromise, rejectPromise) => {
    server.once("error", rejectPromise);
    server.listen(0, "127.0.0.1", resolvePromise);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Unable to reserve an API test port");
  const port = address.port;
  await new Promise<void>((resolvePromise, rejectPromise) => {
    server.close(error => error ? rejectPromise(error) : resolvePromise());
  });
  return port;
}

async function startApiProcess(port: number, appOrigin: string): Promise<ChildProcess> {
  const child = spawn(process.execPath, [
    resolve(process.cwd(), "node_modules/tsx/dist/cli.mjs"), resolve(process.cwd(), "api/server.ts")
  ], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: databaseUrl, APP_ORIGIN: appOrigin, PORT: String(port), NODE_ENV: "test" },
    stdio: ["ignore", "pipe", "pipe"]
  });
  return new Promise<ChildProcess>((resolvePromise, rejectPromise) => {
    let output = "";
    let settled = false;
    const timeout = setTimeout(() => { void fail("Timed out waiting for F-03 API process", output); }, 15000);
    const fail = async (message: string, detail: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      await stopApiProcess(child);
      rejectPromise(new Error(`${message}\n${detail}`));
    };
    child.stdout?.setEncoding("utf8").on("data", (chunk: string) => {
      output += chunk;
      if (!settled && output.includes(`localhost:${port}`)) {
        settled = true;
        clearTimeout(timeout);
        resolvePromise(child);
      }
    });
    child.stderr?.setEncoding("utf8").on("data", (chunk: string) => { output += chunk; });
    child.once("error", error => { void fail(`F-03 API process failed to spawn: ${error.message}`, output); });
    child.once("exit", (code, signal) => {
      if (code !== null || signal !== null) void fail(`F-03 API exited before startup (${code}/${signal})`, output);
    });
  });
}

async function stopApiProcess(child: ChildProcess | undefined): Promise<void> {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  await new Promise<void>(resolvePromise => {
    child.once("close", () => resolvePromise());
    if (!child.kill("SIGTERM")) resolvePromise();
  });
}

beforeAll(async () => {
  await assertTestDatabase(pool);
  await migrate(pool);
});

beforeEach(async () => {
  currentTime = new Date();
  await pool.query("TRUNCATE TABLE workshops, sessions, users RESTART IDENTITY CASCADE");
  for (const email of participantEmails) {
    await pool.query("INSERT INTO users(email,password_hash,role) VALUES($1,$2,'PARTICIPANT')",
      [email, await hashPassword(password)]);
  }
  await pool.query("INSERT INTO users(email,password_hash,role) VALUES($1,$2,'ORGANIZER')",
    ["organizer@example.test", await hashPassword(password)]);
});

afterAll(async () => { await pool.end(); });

describe("F-03 published discovery and capacity-safe registration", () => {
  it("STS-F03-01: Participant sees only published workshops; anonymous and Organizer are denied", async () => {
    const publishedId = await seedWorkshop();
    const draftId = await seedWorkshop({ status: "DRAFT" });
    const participant = await login(participantEmails[0]!);
    const organizer = await login("organizer@example.test");

    expect((await request(app).get("/api/v1/workshops")).status).toBe(401);
    expect((await request(app).get("/api/v1/workshops").set("Cookie", organizer)).status).toBe(403);
    const list = await request(app).get("/api/v1/workshops").set("Cookie", participant);
    expect(list.status).toBe(200);
    expect(list.body.data.map((row: { id: string }) => String(row.id))).toContain(publishedId);
    expect(list.body.data.map((row: { id: string }) => String(row.id))).not.toContain(draftId);
    expect(list.body.data[0]).toHaveProperty("remaining_seats");
    expect(list.body.data[0]).toHaveProperty("title");
    expect(list.body.data[0]).not.toHaveProperty("description");
    expect(list.body.data[0]).not.toHaveProperty("owner_user_id");
  });

  it("STS-F03-02: Participant reads published detail; hidden or missing workshops return safe 404", async () => {
    const publishedId = await seedWorkshop();
    const draftId = await seedWorkshop({ status: "DRAFT" });
    const participant = await login(participantEmails[0]!);
    const organizer = await login("organizer@example.test");

    expect((await request(app).get(`/api/v1/workshops/${publishedId}`)).status).toBe(401);
    expect((await request(app).get(`/api/v1/workshops/${publishedId}`).set("Cookie", organizer)).status).toBe(403);
    const detail = await request(app).get(`/api/v1/workshops/${publishedId}`).set("Cookie", participant);
    expect(detail.status).toBe(200);
    expect(detail.body.data).toMatchObject({ id: publishedId, status: "PUBLISHED", description: "Synthetic F03 fixture", remaining_seats: 10 });
    expect(detail.body.data).not.toHaveProperty("owner_user_id");
    expect((await request(app).get(`/api/v1/workshops/${draftId}`).set("Cookie", participant)).status).toBe(404);
    expect((await request(app).get("/api/v1/workshops/999999").set("Cookie", participant)).status).toBe(404);
  });

  it("STS-F03-03: Registration persists ACTIVE and derives Participant identity from the session", async () => {
    const workshopId = await seedWorkshop();
    const participant = await login(participantEmails[0]!);
    const response = await request(app).post(`/api/v1/workshops/${workshopId}/registrations`)
      .set("Origin", origin).set("Cookie", participant)
      .send({ participant_user_id: 999999, status: "CANCELLED", owner_user_id: 999999 });
    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ workshop_id: workshopId, status: "ACTIVE" });
    const stored = await pool.query(
      `SELECT r.id,r.status,u.email FROM registrations r JOIN users u ON u.id=r.participant_user_id WHERE r.id=$1`,
      [response.body.data.id]
    );
    expect(stored.rows).toHaveLength(1);
    expect(stored.rows[0]).toMatchObject({ status: "ACTIVE", email: participantEmails[0] });
  });

  it("STS-F03-04: Duplicate ACTIVE registration is rejected, including overlapping requests", async () => {
    const workshopId = await seedWorkshop();
    const participant = await login(participantEmails[0]!);
    const url = `/api/v1/workshops/${workshopId}/registrations`;
    const [first, second] = await Promise.all([
      request(app).post(url).set("Origin", origin).set("Cookie", participant).send({}),
      request(app).post(url).set("Origin", origin).set("Cookie", participant).send({})
    ]);
    expect([first.status, second.status].sort()).toEqual([201, 409]);
    const count = await pool.query(
      "SELECT count(*)::int AS n FROM registrations WHERE workshop_id=$1 AND status='ACTIVE'", [workshopId]
    );
    expect(count.rows[0].n).toBe(1);
  });

  it("STS-F03-05: Full capacity rejects another Participant without adding a row", async () => {
    const workshopId = await seedWorkshop({ capacity: 1 });
    const first = await login(participantEmails[0]!);
    const second = await login(participantEmails[1]!);
    expect((await request(app).post(`/api/v1/workshops/${workshopId}/registrations`)
      .set("Origin", origin).set("Cookie", first).send({})).status).toBe(201);
    const rejected = await request(app).post(`/api/v1/workshops/${workshopId}/registrations`)
      .set("Origin", origin).set("Cookie", second).send({});
    expect(rejected.status).toBe(409);
    expect(rejected.body.error.code).toBe("CAPACITY_FULL");
    const count = await pool.query(
      "SELECT count(*)::int AS n FROM registrations WHERE workshop_id=$1 AND status='ACTIVE'", [workshopId]
    );
    expect(count.rows[0].n).toBe(1);
  });

  it("STS-F03-06: Ten overlapping distinct Participants cannot take the same final seat", async () => {
    const workshopId = await seedWorkshop({ capacity: 1 });
    const cookies = await Promise.all(participantEmails.map(email => login(email)));
    let release!: () => void;
    const barrier = new Promise<void>(resolvePromise => { release = resolvePromise; });
    const pending = cookies.map(async cookie => {
      await barrier;
      return request(app).post(`/api/v1/workshops/${workshopId}/registrations`)
        .set("Origin", origin).set("Cookie", cookie).send({});
    });
    release();
    const responses = await Promise.all(pending);
    expect(responses.filter(response => response.status === 201)).toHaveLength(1);
    expect(responses.filter(response => response.status === 409)).toHaveLength(9);
    const count = await pool.query(
      "SELECT count(*)::int AS n FROM registrations WHERE workshop_id=$1 AND status='ACTIVE'", [workshopId]
    );
    expect(count.rows[0].n).toBe(1);
  }, 60000);

  it("STS-F03-07: DRAFT workshops cannot be registered and create no ACTIVE row", async () => {
    const workshopId = await seedWorkshop({ status: "DRAFT" });
    const participant = await login(participantEmails[0]!);
    const response = await request(app).post(`/api/v1/workshops/${workshopId}/registrations`)
      .set("Origin", origin).set("Cookie", participant).send({});
    expect(response.status).toBe(404);
    const count = await pool.query("SELECT count(*)::int AS n FROM registrations WHERE workshop_id=$1", [workshopId]);
    expect(count.rows[0].n).toBe(0);
  });

  it("STS-F03-08: Configured deadline permits before and rejects at/after its boundary", async () => {
    const start = new Date("2026-12-01T10:00:00.000Z");
    const deadline = new Date(start.getTime() - 60 * 60 * 1000);
    const workshopId = await seedWorkshop({ capacity: 3, startsAt: start, deadline });
    const before = await login(participantEmails[0]!);
    const at = await login(participantEmails[1]!);
    const after = await login(participantEmails[2]!);
    currentTime = new Date(deadline.getTime() - 1);
    expect((await request(app).post(`/api/v1/workshops/${workshopId}/registrations`)
      .set("Origin", origin).set("Cookie", before).send({})).status).toBe(201);
    currentTime = deadline;
    const atResponse = await request(app).post(`/api/v1/workshops/${workshopId}/registrations`)
      .set("Origin", origin).set("Cookie", at).send({});
    expect(atResponse.status).toBe(409);
    expect(atResponse.body.error.code).toBe("DEADLINE_PASSED");
    currentTime = new Date(deadline.getTime() + 1);
    expect((await request(app).post(`/api/v1/workshops/${workshopId}/registrations`)
      .set("Origin", origin).set("Cookie", after).send({})).status).toBe(409);
  });

  it("STS-F03-09: Anonymous and Organizer are denied; forged identity cannot change ownership", async () => {
    const workshopId = await seedWorkshop();
    const organizer = await login("organizer@example.test");
    expect((await request(app).post(`/api/v1/workshops/${workshopId}/registrations`)
      .set("Origin", origin).send({})).status).toBe(401);
    expect((await request(app).post(`/api/v1/workshops/${workshopId}/registrations`)
      .set("Origin", origin).set("Cookie", organizer).send({})).status).toBe(403);
    const participant = await login(participantEmails[3]!);
    const success = await request(app).post(`/api/v1/workshops/${workshopId}/registrations`)
      .set("Origin", origin).set("Cookie", participant)
      .send({ participant_user_id: 1, status: "CANCELLED", owner_user_id: 1 });
    expect(success.status).toBe(201);
    const owner = await pool.query("SELECT u.email FROM registrations r JOIN users u ON u.id=r.participant_user_id WHERE r.id=$1",
      [success.body.data.id]);
    expect(owner.rows[0].email).toBe(participantEmails[3]);
  });

  it("STS-F03-10: Registration and remaining capacity persist across a real API process restart", async () => {
    const workshopId = await seedWorkshop({ capacity: 2 });
    const participant = await login(participantEmails[0]!);
    const port = await reservePort();
    const processOrigin = `http://127.0.0.1:${port}`;
    let firstProcess: ChildProcess | undefined;
    let secondProcess: ChildProcess | undefined;
    try {
      firstProcess = await startApiProcess(port, processOrigin);
      const registered = await fetch(`${processOrigin}/api/v1/workshops/${workshopId}/registrations`, {
        method: "POST", headers: { Origin: processOrigin, Cookie: participant, "Content-Type": "application/json" }, body: "{}"
      });
      expect(registered.status).toBe(201);
      await stopApiProcess(firstProcess);
      firstProcess = undefined;

      secondProcess = await startApiProcess(port, processOrigin);
      const restarted = await fetch(`${processOrigin}/api/v1/workshops`, { headers: { Cookie: participant } });
      expect(restarted.status).toBe(200);
      const body = await restarted.json() as { data: Array<{ id: string; remaining_seats: number }> };
      expect(body.data.find(row => String(row.id) === workshopId)?.remaining_seats).toBe(1);
    } finally {
      await stopApiProcess(firstProcess);
      await stopApiProcess(secondProcess);
    }
  });

  it("STS-F03-11: Unknown workshop ID returns a safe conflict without false success", async () => {
    const participant = await login(participantEmails[0]!);
    for (const invalidId of ["999999", "not-an-id", "999999999999999999999999999"]) {
      const response = await request(app).post(`/api/v1/workshops/${invalidId}/registrations`)
        .set("Origin", origin).set("Cookie", participant).send({});
      expect(response.status).toBe(404);
      expect(response.body).not.toHaveProperty("data");
    }
  });

  it("STS-F03-12: Missing configured deadline defaults to starts_at", async () => {
    const start = new Date("2026-12-01T10:00:00.000Z");
    const workshopId = await seedWorkshop({ capacity: 3, startsAt: start, deadline: null });
    const before = await login(participantEmails[0]!);
    const at = await login(participantEmails[1]!);
    const after = await login(participantEmails[2]!);
    currentTime = new Date(start.getTime() - 1);
    expect((await request(app).post(`/api/v1/workshops/${workshopId}/registrations`)
      .set("Origin", origin).set("Cookie", before).send({})).status).toBe(201);
    currentTime = start;
    const atResponse = await request(app).post(`/api/v1/workshops/${workshopId}/registrations`)
      .set("Origin", origin).set("Cookie", at).send({});
    expect(atResponse.status).toBe(409);
    expect(atResponse.body.error.code).toBe("DEADLINE_PASSED");
    currentTime = new Date(start.getTime() + 1);
    expect((await request(app).post(`/api/v1/workshops/${workshopId}/registrations`)
      .set("Origin", origin).set("Cookie", after).send({})).status).toBe(409);
  });

  it("STS-F03-13: Registration fails closed for malformed persisted PUBLISHED deadline", async () => {
    const startsAt = new Date("2026-12-01T10:00:00.000Z");
    const deadline = new Date(startsAt.getTime() + 60 * 1000);
    const participant = await login(participantEmails[0]!);
    await pool.query("ALTER TABLE workshops DROP CONSTRAINT published_deadline");
    let workshopId = "";
    try {
      workshopId = await seedWorkshop({ capacity: 2, startsAt, deadline });
      await pool.query(
        "ALTER TABLE workshops ADD CONSTRAINT published_deadline CHECK (status = 'DRAFT' OR registration_deadline IS NULL OR registration_deadline <= starts_at) NOT VALID"
      );
      currentTime = new Date(startsAt.getTime() - 60 * 60 * 1000);
      const response = await request(app).post(`/api/v1/workshops/${workshopId}/registrations`)
        .set("Origin", origin).set("Cookie", participant).send({});
      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe("INVALID_DEADLINE");
      const count = await pool.query(
        "SELECT count(*)::int AS n FROM registrations WHERE workshop_id=$1 AND status='ACTIVE'", [workshopId]
      );
      expect(count.rows[0].n).toBe(0);
    } finally {
      if (workshopId) await pool.query("DELETE FROM workshops WHERE id=$1", [workshopId]);
      await pool.query("ALTER TABLE workshops VALIDATE CONSTRAINT published_deadline");
    }
  });
});
