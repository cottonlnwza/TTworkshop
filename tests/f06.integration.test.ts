import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer as createNetServer } from "node:net";
import { resolve } from "node:path";
import request from "supertest";
import { Pool } from "pg";
import { createApp } from "../api/app.js";
import { hashPassword } from "../api/password.js";
import { migrate, migrationFiles } from "../api/migrate.js";
import { verifyProductionSchema } from "../api/runtime-schema.js";
import { requireTestDatabaseUrl, assertTestDatabase } from "./helpers/testDatabase.js";

const origin = "http://localhost:5173";
const password = "synthetic-f06-password-not-for-production";
const databaseUrl = requireTestDatabaseUrl(process.env.PG_TEST_URL);
const pool = new Pool({ connectionString: databaseUrl });

let fakeNow = new Date("2026-11-23T10:00:00.000Z");
const app = createApp(pool, {
  appOrigin: origin,
  production: false,
  sessionHours: 8,
  now: () => fakeNow
});

const emails = {
  participantA: "f06.participant.a@example.test",
  participantB: "f06.participant.b@example.test",
  organizerA: "f06.organizer.a@example.test",
  organizerB: "f06.organizer.b@example.test"
};
let ids: Record<keyof typeof emails, string>;

async function login(email: string): Promise<string> {
  const response = await request(app)
    .post("/api/v1/auth/login")
    .set("Origin", origin)
    .send({ email, password });
  expect(response.status).toBe(200);
  const header = response.headers["set-cookie"];
  const values = Array.isArray(header) ? header : header ? [header] : [];
  return values[0]?.split(";")[0] ?? "";
}

async function seedWorkshop(options: {
  ownerId?: string;
  capacity?: number;
  startsAt?: string;
  endsAt?: string;
  deadline?: string | null;
  status?: "DRAFT" | "PUBLISHED";
} = {}): Promise<string> {
  const result = await pool.query(
    "INSERT INTO workshops (owner_user_id,title,description,location,starts_at,ends_at,capacity,registration_deadline,status) " +
    "VALUES ($1,'F06 Workshop','F06 synthetic workshop','Room F06',$2,$3,$4,$5,$6) RETURNING id",
    [
      options.ownerId ?? ids.organizerA,
      options.startsAt ?? "2026-12-10T10:00:00Z",
      options.endsAt ?? "2026-12-10T12:00:00Z",
      options.capacity ?? 3,
      options.deadline === undefined ? "2026-12-09T18:00:00Z" : options.deadline,
      options.status ?? "PUBLISHED"
    ]
  );
  return String(result.rows[0].id);
}

async function reserveLocalPort(): Promise<number> {
  const server = createNetServer();
  await new Promise<void>((resolvePromise, rejectPromise) => {
    server.once("error", rejectPromise);
    server.listen(0, "127.0.0.1", resolvePromise);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Unable to reserve local port");
  const port = address.port;
  await new Promise<void>((resolvePromise, rejectPromise) => {
    server.close(error => (error ? rejectPromise(error) : resolvePromise()));
  });
  return port;
}

async function stopApiProcess(child: ChildProcess | undefined): Promise<void> {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  await new Promise<void>(resolvePromise => {
    child.once("close", () => resolvePromise());
    if (!child.kill("SIGTERM")) resolvePromise();
  });
}

function startApiProcess(port: number, appOrigin: string): Promise<ChildProcess> {
  const child = spawn(process.execPath, [
    resolve(process.cwd(), "node_modules/tsx/dist/cli.mjs"),
    resolve(process.cwd(), "api/server.ts")
  ], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      APP_ORIGIN: appOrigin,
      PORT: String(port),
      NODE_ENV: "test"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  return new Promise<ChildProcess>((resolvePromise, rejectPromise) => {
    let output = "";
    let settled = false;
    const fail = async (reason: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      await stopApiProcess(child);
      rejectPromise(new Error(`${reason}\n${output}`));
    };
    const timeout = setTimeout(() => { void fail("Timed out waiting for F-06 API process"); }, 15000);
    child.stdout?.setEncoding("utf8").on("data", (chunk: string) => {
      output += chunk;
      if (!settled && output.includes(`localhost:${port}`)) {
        settled = true;
        clearTimeout(timeout);
        resolvePromise(child);
      }
    });
    child.stderr?.setEncoding("utf8").on("data", (chunk: string) => { output += chunk; });
    child.once("error", error => { void fail(`F-06 API spawn error: ${error.message}`); });
    child.once("exit", (code, signal) => {
      if (!settled) void fail(`F-06 API exited early (${code}/${signal})`);
    });
  });
}

beforeAll(async () => {
  await assertTestDatabase(pool);
  await migrate(pool);
});

beforeEach(async () => {
  fakeNow = new Date("2026-11-23T10:00:00.000Z");
  await pool.query("TRUNCATE TABLE workshops, sessions, users RESTART IDENTITY CASCADE");
  const passwordHash = await hashPassword(password);
  const inserted = await pool.query(
    "INSERT INTO users(email,password_hash,role) VALUES " +
    "($1,$5,'PARTICIPANT'),($2,$5,'PARTICIPANT'),($3,$5,'ORGANIZER'),($4,$5,'ORGANIZER') " +
    "RETURNING id,email",
    [emails.participantA, emails.participantB, emails.organizerA, emails.organizerB, passwordHash]
  );
  ids = Object.fromEntries(inserted.rows.map(row => [
    Object.keys(emails).find(key => emails[key as keyof typeof emails] === row.email)!,
    String(row.id)
  ])) as Record<keyof typeof emails, string>;
});

afterAll(async () => {
  await pool.end();
});

describe("F-06 Registration Deadline Management & Manual Closure/Reopen Integration", () => {
  it("STS-F06-01: migration 005 adds workshops.registration_closed DEFAULT false idempotently and passes verifyProductionSchema", async () => {
    const files = await migrationFiles();
    expect(files).toContain("005_workshop_manual_closure.sql");

    await migrate(pool);
    await verifyProductionSchema(pool);

    const workshopId = await seedWorkshop();
    const row = await pool.query<{ registration_closed: boolean }>(
      "SELECT registration_closed FROM workshops WHERE id=$1",
      [workshopId]
    );
    expect(row.rows[0]?.registration_closed).toBe(false);

    // Fails closed if 005 is missing from schema_migrations
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM schema_migrations WHERE filename='005_workshop_manual_closure.sql'");
      await expect(verifyProductionSchema(client as never)).rejects.toThrow("Production database schema is not ready");
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });

  it("STS-F06-02: owning Organizer closes PUBLISHED workshop; discovery shows closed and new registration returns 409 REGISTRATION_CLOSED", async () => {
    const workshopId = await seedWorkshop({ capacity: 3 });
    const cookieOrg = await login(emails.organizerA);
    const cookieP = await login(emails.participantA);

    const closed = await request(app)
      .post(`/api/v1/organizer/workshops/${workshopId}/close-registration`)
      .set("Origin", origin)
      .set("Cookie", cookieOrg)
      .send({});
    expect(closed.status).toBe(200);
    expect(closed.body.data).toMatchObject({
      id: workshopId,
      status: "PUBLISHED",
      registration_closed: true
    });

    const orgList = await request(app)
      .get("/api/v1/organizer/workshops")
      .set("Origin", origin)
      .set("Cookie", cookieOrg);
    expect(orgList.status).toBe(200);
    expect(orgList.body.data[0].registration_closed).toBe(true);

    const list = await request(app).get("/api/v1/workshops").set("Cookie", cookieP);
    expect(list.status).toBe(200);
    expect(list.body.data[0]).toMatchObject({
      id: workshopId,
      registration_closed: true,
      registration_open: false
    });

    const detail = await request(app).get(`/api/v1/workshops/${workshopId}`).set("Cookie", cookieP);
    expect(detail.status).toBe(200);
    expect(detail.body.data).toMatchObject({
      id: workshopId,
      registration_closed: true,
      registration_open: false
    });

    const attempt = await request(app)
      .post(`/api/v1/workshops/${workshopId}/registrations`)
      .set("Origin", origin)
      .set("Cookie", cookieP)
      .send({});
    expect(attempt.status).toBe(409);
    expect(attempt.body.error.code).toBe("REGISTRATION_CLOSED");

    const count = await pool.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM registrations WHERE workshop_id=$1",
      [workshopId]
    );
    expect(count.rows[0].count).toBe(0);
  });

  it("STS-F06-03 / STS-F05-06 (BR-10): manual closure allows timely ACTIVE cancellation, does not auto-reopen, and blocks re-registration and new registration", async () => {
    const workshopId = await seedWorkshop({ capacity: 3 });
    const cookieOrg = await login(emails.organizerA);
    const cookieA = await login(emails.participantA);
    const cookieB = await login(emails.participantB);

    // Participant A registers while open
    const regA = await request(app)
      .post(`/api/v1/workshops/${workshopId}/registrations`)
      .set("Origin", origin).set("Cookie", cookieA).send({});
    expect(regA.status).toBe(201);
    const regId = String(regA.body.data.id);

    // Organizer manually closes registration
    const close = await request(app)
      .post(`/api/v1/organizer/workshops/${workshopId}/close-registration`)
      .set("Origin", origin).set("Cookie", cookieOrg).send({});
    expect(close.status).toBe(200);
    expect(close.body.data.registration_closed).toBe(true);

    // Participant A cancels via live F-05 endpoint before deadline -> MUST SUCCEED (BR-10)
    const cancel = await request(app)
      .post(`/api/v1/me/registrations/${regId}/cancel`)
      .set("Origin", origin).set("Cookie", cookieA).send({});
    expect(cancel.status).toBe(200);
    expect(cancel.body.data).toMatchObject({
      registration_id: regId,
      status: "CANCELLED"
    });
    expect(cancel.body.data.cancelled_at).toBeTruthy();

    // Workshop MUST remain manually closed (no auto-reopen)
    const dbWorkshop = await pool.query<{ registration_closed: boolean }>(
      "SELECT registration_closed FROM workshops WHERE id=$1",
      [workshopId]
    );
    expect(dbWorkshop.rows[0].registration_closed).toBe(true);

    // Both Participant A re-registration and Participant B new registration MUST be blocked
    const reRegA = await request(app)
      .post(`/api/v1/workshops/${workshopId}/registrations`)
      .set("Origin", origin).set("Cookie", cookieA).send({});
    expect(reRegA.status).toBe(409);
    expect(reRegA.body.error.code).toBe("REGISTRATION_CLOSED");

    const newRegB = await request(app)
      .post(`/api/v1/workshops/${workshopId}/registrations`)
      .set("Origin", origin).set("Cookie", cookieB).send({});
    expect(newRegB.status).toBe(409);
    expect(newRegB.body.error.code).toBe("REGISTRATION_CLOSED");
  });

  it("STS-F06-04: owning Organizer reopens closed PUBLISHED workshop before effective deadline and registration succeeds again", async () => {
    const workshopId = await seedWorkshop({ capacity: 2 });
    const cookieOrg = await login(emails.organizerA);
    const cookieP = await login(emails.participantA);

    expect((await request(app)
      .post(`/api/v1/organizer/workshops/${workshopId}/close-registration`)
      .set("Origin", origin).set("Cookie", cookieOrg).send({})).status).toBe(200);

    const reopened = await request(app)
      .post(`/api/v1/organizer/workshops/${workshopId}/reopen-registration`)
      .set("Origin", origin).set("Cookie", cookieOrg).send({});
    expect(reopened.status).toBe(200);
    expect(reopened.body.data).toMatchObject({
      id: workshopId,
      registration_closed: false
    });

    const detail = await request(app).get(`/api/v1/workshops/${workshopId}`).set("Cookie", cookieP);
    expect(detail.body.data).toMatchObject({
      registration_closed: false,
      registration_open: true
    });

    const reg = await request(app)
      .post(`/api/v1/workshops/${workshopId}/registrations`)
      .set("Origin", origin).set("Cookie", cookieP).send({});
    expect(reg.status).toBe(201);
  });

  it("STS-F06-05: manual reopen at or after effective deadline (explicit and default starts_at) returns 409 DEADLINE_PASSED", async () => {
    const cookieOrg = await login(emails.organizerA);
    const explicitW = await seedWorkshop({
      startsAt: "2026-12-10T10:00:00Z",
      endsAt: "2026-12-10T12:00:00Z",
      deadline: "2026-12-09T18:00:00Z"
    });
    const defaultW = await seedWorkshop({
      startsAt: "2026-12-11T10:00:00Z",
      endsAt: "2026-12-11T12:00:00Z",
      deadline: null
    });

    expect((await request(app)
      .post(`/api/v1/organizer/workshops/${explicitW}/close-registration`)
      .set("Origin", origin).set("Cookie", cookieOrg).send({})).status).toBe(200);
    expect((await request(app)
      .post(`/api/v1/organizer/workshops/${defaultW}/close-registration`)
      .set("Origin", origin).set("Cookie", cookieOrg).send({})).status).toBe(200);

    // Exact equality on explicit deadline
    fakeNow = new Date("2026-12-09T18:00:00.000Z");
    const atExplicit = await request(app)
      .post(`/api/v1/organizer/workshops/${explicitW}/reopen-registration`)
      .set("Origin", origin).set("Cookie", cookieOrg).send({});
    expect(atExplicit.status).toBe(409);
    expect(atExplicit.body.error.code).toBe("DEADLINE_PASSED");

    // After explicit deadline
    fakeNow = new Date("2026-12-09T18:00:01.000Z");
    const afterExplicit = await request(app)
      .post(`/api/v1/organizer/workshops/${explicitW}/reopen-registration`)
      .set("Origin", origin).set("Cookie", cookieOrg).send({});
    expect(afterExplicit.status).toBe(409);
    expect(afterExplicit.body.error.code).toBe("DEADLINE_PASSED");

    // Exact equality on default deadline = starts_at
    fakeNow = new Date("2026-12-11T10:00:00.000Z");
    const atDefault = await request(app)
      .post(`/api/v1/organizer/workshops/${defaultW}/reopen-registration`)
      .set("Origin", origin).set("Cookie", cookieOrg).send({});
    expect(atDefault.status).toBe(409);
    expect(atDefault.body.error.code).toBe("DEADLINE_PASSED");

    const stillClosed = await pool.query<{ registration_closed: boolean }>(
      "SELECT registration_closed FROM workshops WHERE id IN ($1, $2)",
      [explicitW, defaultW]
    );
    expect(stillClosed.rows.every(r => r.registration_closed === true)).toBe(true);
  });

  it("STS-F06-06: owning Organizer updates published registration_deadline (earlier or null default) without altering registration_closed", async () => {
    const workshopId = await seedWorkshop({
      startsAt: "2026-12-10T10:00:00Z",
      endsAt: "2026-12-10T12:00:00Z",
      deadline: "2026-12-09T18:00:00Z"
    });
    const cookieOrg = await login(emails.organizerA);
    const cookieP = await login(emails.participantA);

    // Move deadline into the past relative to fakeNow (2026-11-23T10:00:00Z)
    const pastUpdate = await request(app)
      .patch(`/api/v1/organizer/workshops/${workshopId}/registration-deadline`)
      .set("Origin", origin).set("Cookie", cookieOrg)
      .send({ registration_deadline: "2026-11-23T09:00:00Z" });
    expect(pastUpdate.status).toBe(200);
    expect(pastUpdate.body.data.registration_closed).toBe(false);

    const lateReg = await request(app)
      .post(`/api/v1/workshops/${workshopId}/registrations`)
      .set("Origin", origin).set("Cookie", cookieP).send({});
    expect(lateReg.status).toBe(409);
    expect(lateReg.body.error.code).toBe("DEADLINE_PASSED");

    // Reset deadline to null (defaults to future starts_at)
    const nullUpdate = await request(app)
      .patch(`/api/v1/organizer/workshops/${workshopId}/registration-deadline`)
      .set("Origin", origin).set("Cookie", cookieOrg)
      .send({ registration_deadline: null });
    expect(nullUpdate.status).toBe(200);
    expect(nullUpdate.body.data.registration_deadline).toBeNull();
    expect(nullUpdate.body.data.registration_closed).toBe(false);

    const okReg = await request(app)
      .post(`/api/v1/workshops/${workshopId}/registrations`)
      .set("Origin", origin).set("Cookie", cookieP).send({});
    expect(okReg.status).toBe(201);

    // Close manually, then update deadline -> registration_closed MUST stay true
    expect((await request(app)
      .post(`/api/v1/organizer/workshops/${workshopId}/close-registration`)
      .set("Origin", origin).set("Cookie", cookieOrg).send({})).status).toBe(200);
    const closedUpdate = await request(app)
      .patch(`/api/v1/organizer/workshops/${workshopId}/registration-deadline`)
      .set("Origin", origin).set("Cookie", cookieOrg)
      .send({ registration_deadline: "2026-12-09T12:00:00+07:00" });
    expect(closedUpdate.status).toBe(200);
    expect(closedUpdate.body.data.registration_closed).toBe(true);
  });

  it("STS-F06-07: rejects deadline > starts_at, timezone-naive timestamps, missing key, and ended workshops", async () => {
    const workshopId = await seedWorkshop({
      startsAt: "2026-12-10T10:00:00Z",
      endsAt: "2026-12-10T12:00:00Z",
      deadline: "2026-12-09T18:00:00Z"
    });
    const cookieOrg = await login(emails.organizerA);

    const afterStart = await request(app)
      .patch(`/api/v1/organizer/workshops/${workshopId}/registration-deadline`)
      .set("Origin", origin).set("Cookie", cookieOrg)
      .send({ registration_deadline: "2026-12-10T10:01:00Z" });
    expect(afterStart.status).toBe(400);
    expect(afterStart.body.error.code).toBe("VALIDATION");

    const naive = await request(app)
      .patch(`/api/v1/organizer/workshops/${workshopId}/registration-deadline`)
      .set("Origin", origin).set("Cookie", cookieOrg)
      .send({ registration_deadline: "2026-12-09T10:00:00" });
    expect(naive.status).toBe(400);
    expect(naive.body.error.code).toBe("VALIDATION");

    const missingKey = await request(app)
      .patch(`/api/v1/organizer/workshops/${workshopId}/registration-deadline`)
      .set("Origin", origin).set("Cookie", cookieOrg)
      .send({});
    expect(missingKey.status).toBe(400);
    expect(missingKey.body.error.code).toBe("VALIDATION");

    fakeNow = new Date("2026-12-10T12:00:00.000Z");
    const ended = await request(app)
      .patch(`/api/v1/organizer/workshops/${workshopId}/registration-deadline`)
      .set("Origin", origin).set("Cookie", cookieOrg)
      .send({ registration_deadline: "2026-12-09T12:00:00Z" });
    expect(ended.status).toBe(409);
    expect(ended.body.error.code).toBe("WORKSHOP_ENDED");

    const unchanged = await pool.query<{ registration_deadline: Date }>(
      "SELECT registration_deadline FROM workshops WHERE id=$1",
      [workshopId]
    );
    expect(unchanged.rows[0].registration_deadline.toISOString()).toBe("2026-12-09T18:00:00.000Z");
  });

  it("STS-F06-08: enforces 401/403/404/Origin and 409 INVALID_STATE guards across all F-06 endpoints", async () => {
    const publishedId = await seedWorkshop({ ownerId: ids.organizerA, status: "PUBLISHED" });
    const draftId = await seedWorkshop({ ownerId: ids.organizerA, status: "DRAFT" });
    const cookieOrgA = await login(emails.organizerA);
    const cookieOrgB = await login(emails.organizerB);
    const cookieP = await login(emails.participantA);

    const endpoints = [
      { method: "post" as const, path: `/api/v1/organizer/workshops/${publishedId}/close-registration`, body: {} },
      { method: "post" as const, path: `/api/v1/organizer/workshops/${publishedId}/reopen-registration`, body: {} },
      { method: "patch" as const, path: `/api/v1/organizer/workshops/${publishedId}/registration-deadline`, body: { registration_deadline: null } }
    ];

    for (const ep of endpoints) {
      // Anonymous -> 401
      expect((await request(app)[ep.method](ep.path).set("Origin", origin).send(ep.body)).status).toBe(401);
      // Participant -> 403
      expect((await request(app)[ep.method](ep.path).set("Origin", origin).set("Cookie", cookieP).send(ep.body)).status).toBe(403);
      // Foreign Organizer B -> 404
      expect((await request(app)[ep.method](ep.path).set("Origin", origin).set("Cookie", cookieOrgB).send(ep.body)).status).toBe(404);
      // Bad Origin -> 403 FORBIDDEN_ORIGIN
      const badOrigin = await request(app)[ep.method](ep.path).set("Origin", "https://evil.example.test").set("Cookie", cookieOrgA).send(ep.body);
      expect(badOrigin.status).toBe(403);
      expect(badOrigin.body.error.code).toBe("FORBIDDEN_ORIGIN");
    }

    // Invalid ID -> 404
    expect((await request(app).post("/api/v1/organizer/workshops/not-a-num/close-registration")
      .set("Origin", origin).set("Cookie", cookieOrgA).send({})).status).toBe(404);

    // DRAFT workshop -> 409 INVALID_STATE on all three endpoints
    expect((await request(app).post(`/api/v1/organizer/workshops/${draftId}/close-registration`)
      .set("Origin", origin).set("Cookie", cookieOrgA).send({})).status).toBe(409);
    expect((await request(app).post(`/api/v1/organizer/workshops/${draftId}/reopen-registration`)
      .set("Origin", origin).set("Cookie", cookieOrgA).send({})).status).toBe(409);
    expect((await request(app).patch(`/api/v1/organizer/workshops/${draftId}/registration-deadline`)
      .set("Origin", origin).set("Cookie", cookieOrgA).send({ registration_deadline: null })).status).toBe(409);

    // Reopen when already open -> 409 INVALID_STATE
    const reopenOpen = await request(app).post(`/api/v1/organizer/workshops/${publishedId}/reopen-registration`)
      .set("Origin", origin).set("Cookie", cookieOrgA).send({});
    expect(reopenOpen.status).toBe(409);
    expect(reopenOpen.body.error.code).toBe("INVALID_STATE");

    // Close once -> 200, close twice -> 409 INVALID_STATE
    expect((await request(app).post(`/api/v1/organizer/workshops/${publishedId}/close-registration`)
      .set("Origin", origin).set("Cookie", cookieOrgA).send({})).status).toBe(200);
    const doubleClose = await request(app).post(`/api/v1/organizer/workshops/${publishedId}/close-registration`)
      .set("Origin", origin).set("Cookie", cookieOrgA).send({});
    expect(doubleClose.status).toBe(409);
    expect(doubleClose.body.error.code).toBe("INVALID_STATE");
  });

  it("STS-F06-09: manual closure state and updated deadline survive a real API process restart", async () => {
    const port = await reserveLocalPort();
    const appOrigin = `http://localhost:${port}`;
    const workshopId = await seedWorkshop({
      startsAt: "2026-12-20T10:00:00Z",
      endsAt: "2026-12-20T12:00:00Z",
      deadline: "2026-12-19T18:00:00Z"
    });
    let child: ChildProcess | undefined;

    try {
      const procA = await startApiProcess(port, appOrigin);
      child = procA;
      const pidA = procA.pid;

      const loginOrg = await fetch(`${appOrigin}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: appOrigin },
        body: JSON.stringify({ email: emails.organizerA, password })
      });
      expect(loginOrg.status).toBe(200);
      const cookieOrg = loginOrg.headers.get("set-cookie")!.split(";")[0]!;

      const closeRes = await fetch(`${appOrigin}/api/v1/organizer/workshops/${workshopId}/close-registration`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: appOrigin, Cookie: cookieOrg },
        body: "{}"
      });
      expect(closeRes.status).toBe(200);

      const dlRes = await fetch(`${appOrigin}/api/v1/organizer/workshops/${workshopId}/registration-deadline`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Origin: appOrigin, Cookie: cookieOrg },
        body: JSON.stringify({ registration_deadline: "2026-12-18T15:00:00Z" })
      });
      expect(dlRes.status).toBe(200);

      await stopApiProcess(procA);
      const procB = await startApiProcess(port, appOrigin);
      child = procB;
      expect(procB.pid).not.toBe(pidA);

      const getAfter = await fetch(`${appOrigin}/api/v1/organizer/workshops/${workshopId}`, {
        headers: { Origin: appOrigin, Cookie: cookieOrg }
      });
      expect(getAfter.status).toBe(200);
      const body = (await getAfter.json()) as {
        data: { registration_closed: boolean; registration_deadline: string };
      };
      expect(body.data.registration_closed).toBe(true);
      expect(new Date(body.data.registration_deadline).toISOString()).toBe("2026-12-18T15:00:00.000Z");
    } finally {
      await stopApiProcess(child);
    }
  }, 60000);
});
