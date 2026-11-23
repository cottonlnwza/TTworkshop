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
const password = "synthetic-f08-password-not-for-production";
const databaseUrl = requireTestDatabaseUrl(process.env.PG_TEST_URL);
const pool = new Pool({ connectionString: databaseUrl });

let fakeNow = new Date("2026-12-15T10:30:00.000Z");
const app = createApp(pool, {
  appOrigin: origin,
  production: false,
  sessionHours: 8,
  now: () => fakeNow
});

const emails = {
  participantA: "f08.participant.a@example.test",
  participantB: "f08.participant.b@example.test",
  participantC: "f08.participant.c@example.test",
  organizerA: "f08.organizer.a@example.test",
  organizerB: "f08.organizer.b@example.test"
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
  title?: string;
  startsAt?: string;
  endsAt?: string;
  deadline?: string | null;
  status?: "DRAFT" | "PUBLISHED";
} = {}): Promise<string> {
  const result = await pool.query(
    "INSERT INTO workshops (owner_user_id,title,description,location,starts_at,ends_at,capacity,registration_deadline,status) " +
    "VALUES ($1,$2,'F08 check-in workshop','Room F08',$3,$4,10,$5,$6) RETURNING id",
    [
      options.ownerId ?? ids.organizerA,
      options.title ?? "F08 Workshop",
      options.startsAt ?? "2026-12-15T10:00:00.000000Z",
      options.endsAt ?? "2026-12-15T12:00:00.000000Z",
      options.deadline === undefined ? null : options.deadline,
      options.status ?? "PUBLISHED"
    ]
  );
  return String(result.rows[0].id);
}

async function seedRegistration(
  workshopId: string,
  participantId: string,
  status: "ACTIVE" | "CANCELLED" = "ACTIVE"
): Promise<string> {
  const result = await pool.query(
    "INSERT INTO registrations (workshop_id, participant_user_id, status, cancelled_at) " +
    "VALUES ($1,$2,$3,$4) RETURNING id",
    [workshopId, participantId, status, status === "CANCELLED" ? new Date("2026-12-14T10:00:00Z") : null]
  );
  return String(result.rows[0].id);
}

async function waitUntilBlockedOnWorkshopsLock(lockerPid: number, expectedWaiters = 1): Promise<void> {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const res = await pool.query<{ waiting: number }>(
      "SELECT count(*)::int AS waiting FROM pg_stat_activity " +
      "WHERE datname = current_database() AND pid <> $1 AND wait_event_type = 'Lock' " +
      "AND query ILIKE '%FROM workshops%' AND query ILIKE '%FOR UPDATE%'",
      [lockerPid]
    );
    if ((res.rows[0]?.waiting ?? 0) >= expectedWaiters) return;
    await new Promise(resolveDelay => setTimeout(resolveDelay, 15));
  }
  throw new Error(`Timed out waiting for ${expectedWaiters} transaction(s) to block on workshops FOR UPDATE lock`);
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
    const timeout = setTimeout(() => { void fail("Timed out waiting for F-08 API process"); }, 15000);
    child.stdout?.setEncoding("utf8").on("data", (chunk: string) => {
      output += chunk;
      if (!settled && output.includes(`localhost:${port}`)) {
        settled = true;
        clearTimeout(timeout);
        resolvePromise(child);
      }
    });
    child.stderr?.setEncoding("utf8").on("data", (chunk: string) => { output += chunk; });
    child.once("error", error => { void fail(`Failed to spawn F-08 API: ${error.message}`); });
    child.once("exit", (code, signal) => {
      if (!settled) void fail(`F-08 API exited early (${code}/${signal})`);
    });
  });
}

beforeAll(async () => {
  await assertTestDatabase(pool);
  await migrate(pool);
});

beforeEach(async () => {
  fakeNow = new Date("2026-12-15T10:30:00.000Z");
  await pool.query("TRUNCATE TABLE registrations, workshops, sessions, users RESTART IDENTITY CASCADE");
  const passwordHash = await hashPassword(password);
  const result = await pool.query(
    "INSERT INTO users(email,password_hash,role) VALUES " +
    "($1,$6,'PARTICIPANT'),($2,$6,'PARTICIPANT'),($3,$6,'PARTICIPANT')," +
    "($4,$6,'ORGANIZER'),($5,$6,'ORGANIZER') RETURNING id,email",
    [emails.participantA, emails.participantB, emails.participantC, emails.organizerA, emails.organizerB, passwordHash]
  );
  const byEmail = new Map<string, string>(result.rows.map(r => [r.email as string, String(r.id)]));
  ids = {
    participantA: byEmail.get(emails.participantA)!,
    participantB: byEmail.get(emails.participantB)!,
    participantC: byEmail.get(emails.participantC)!,
    organizerA: byEmail.get(emails.organizerA)!,
    organizerB: byEmail.get(emails.organizerB)!
  };
});

afterAll(async () => {
  await pool.end();
});

describe("F-08 Event Attendance Check-in (PostgreSQL integration)", () => {
  it("STS-F08-01: owning Organizer checks in ACTIVE registrations at exact starts_at, mid-window, and exact ends_at; checked_in_at appears on roster & Participant views without PII", async () => {
    const wsId = await seedWorkshop({
      startsAt: "2026-12-15T10:00:00.000000Z",
      endsAt: "2026-12-15T12:00:00.000000Z"
    });
    const regA = await seedRegistration(wsId, ids.participantA, "ACTIVE");
    const regB = await seedRegistration(wsId, ids.participantB, "ACTIVE");
    const regC = await seedRegistration(wsId, ids.participantC, "ACTIVE");
    const orgCookie = await login(emails.organizerA);
    const partACookie = await login(emails.participantA);

    // Exact starts_at boundary
    fakeNow = new Date("2026-12-15T10:00:00.000Z");
    const resStart = await request(app)
      .post(`/api/v1/organizer/workshops/${wsId}/registrations/${regA}/check-in`)
      .set("Origin", origin)
      .set("Cookie", orgCookie)
      .send({});
    expect(resStart.status).toBe(200);
    expect(resStart.headers["cache-control"]).toBe("no-store");
    expect(resStart.body.data.registration_id).toBe(regA);
    expect(resStart.body.data.status).toBe("ACTIVE");
    expect(resStart.body.data.checked_in_at).toBe("2026-12-15T10:00:00.000000Z");

    // Mid-window
    fakeNow = new Date("2026-12-15T11:00:00.000Z");
    const resMid = await request(app)
      .post(`/api/v1/organizer/workshops/${wsId}/registrations/${regB}/check-in`)
      .set("Origin", origin)
      .set("Cookie", orgCookie)
      .send({});
    expect(resMid.status).toBe(200);
    expect(resMid.body.data.checked_in_at).toBe("2026-12-15T11:00:00.000000Z");

    // Exact ends_at boundary
    fakeNow = new Date("2026-12-15T12:00:00.000Z");
    const resEnd = await request(app)
      .post(`/api/v1/organizer/workshops/${wsId}/registrations/${regC}/check-in`)
      .set("Origin", origin)
      .set("Cookie", orgCookie)
      .send({});
    expect(resEnd.status).toBe(200);
    expect(resEnd.body.data.checked_in_at).toBe("2026-12-15T12:00:00.000000Z");

    // Organizer roster exposes checked_in_at with zero email/name PII (6 authorized keys)
    const roster = await request(app)
      .get(`/api/v1/organizer/workshops/${wsId}/registrations`)
      .set("Cookie", orgCookie);
    expect(roster.status).toBe(200);
    const rowA = roster.body.data.find((r: { registration_id: string }) => r.registration_id === regA);
    expect(rowA.checked_in_at).toBe("2026-12-15T10:00:00.000000Z");
    expect(Object.keys(rowA).sort()).toEqual(
      ["cancelled_at", "checked_in_at", "participant_id", "registered_at", "registration_id", "status"].sort()
    );
    expect(JSON.stringify(roster.body)).not.toContain(emails.participantA);

    // Participant /me/registrations and /me/registrations/:id expose checked_in_at
    const meList = await request(app).get("/api/v1/me/registrations").set("Cookie", partACookie);
    expect(meList.status).toBe(200);
    expect(meList.body.data[0].checked_in_at).toBe("2026-12-15T10:00:00.000000Z");

    const meDetail = await request(app).get(`/api/v1/me/registrations/${regA}`).set("Cookie", partACookie);
    expect(meDetail.status).toBe(200);
    expect(meDetail.body.data.checked_in_at).toBe("2026-12-15T10:00:00.000000Z");
  });

  it("STS-F08-02: rejects sequential and concurrent duplicate check-in with 409 ALREADY_CHECKED_IN without overwriting checked_in_at", async () => {
    const wsId = await seedWorkshop();
    const regA = await seedRegistration(wsId, ids.participantA, "ACTIVE");
    const regB = await seedRegistration(wsId, ids.participantB, "ACTIVE");
    const orgCookie = await login(emails.organizerA);

    fakeNow = new Date("2026-12-15T10:15:00.000Z");
    const first = await request(app)
      .post(`/api/v1/organizer/workshops/${wsId}/registrations/${regA}/check-in`)
      .set("Origin", origin)
      .set("Cookie", orgCookie)
      .send({});
    expect(first.status).toBe(200);

    fakeNow = new Date("2026-12-15T10:45:00.000Z");
    const second = await request(app)
      .post(`/api/v1/organizer/workshops/${wsId}/registrations/${regA}/check-in`)
      .set("Origin", origin)
      .set("Cookie", orgCookie)
      .send({});
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe("ALREADY_CHECKED_IN");

    const dbCheck = await pool.query(
      "SELECT to_char(checked_in_at AT TIME ZONE 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"') AS ts FROM registrations WHERE id = $1",
      [regA]
    );
    expect(dbCheck.rows[0].ts).toBe("2026-12-15T10:15:00.000000Z");

    // Concurrent duplicate check-in race -> exactly one 200 and one 409 ALREADY_CHECKED_IN
    const [r1, r2] = await Promise.all([
      request(app).post(`/api/v1/organizer/workshops/${wsId}/registrations/${regB}/check-in`).set("Origin", origin).set("Cookie", orgCookie).send({}),
      request(app).post(`/api/v1/organizer/workshops/${wsId}/registrations/${regB}/check-in`).set("Origin", origin).set("Cookie", orgCookie).send({})
    ]);
    const statuses = [r1.status, r2.status].sort((a, b) => a - b);
    expect(statuses).toEqual([200, 409]);
    const loser = r1.status === 409 ? r1 : r2;
    expect(loser.body.error.code).toBe("ALREADY_CHECKED_IN");
  });

  it("STS-F08-03: rejects before starts_at and after ends_at (including lock-wait crossing ends_at) with 409 CHECKIN_WINDOW_CLOSED", async () => {
    const wsId = await seedWorkshop({
      startsAt: "2026-12-15T10:00:00.000000Z",
      endsAt: "2026-12-15T12:00:00.000000Z"
    });
    const regId = await seedRegistration(wsId, ids.participantA, "ACTIVE");
    const orgCookie = await login(emails.organizerA);

    // starts_at - 1s -> 409 CHECKIN_WINDOW_CLOSED
    fakeNow = new Date("2026-12-15T09:59:59.000Z");
    const before = await request(app)
      .post(`/api/v1/organizer/workshops/${wsId}/registrations/${regId}/check-in`)
      .set("Origin", origin)
      .set("Cookie", orgCookie)
      .send({});
    expect(before.status).toBe(409);
    expect(before.body.error.code).toBe("CHECKIN_WINDOW_CLOSED");
    expect(before.body.error.message).toContain("not opened");

    // ends_at + 1s -> 409 CHECKIN_WINDOW_CLOSED
    fakeNow = new Date("2026-12-15T12:00:01.000Z");
    const after = await request(app)
      .post(`/api/v1/organizer/workshops/${wsId}/registrations/${regId}/check-in`)
      .set("Origin", origin)
      .set("Cookie", orgCookie)
      .send({});
    expect(after.status).toBe(409);
    expect(after.body.error.code).toBe("CHECKIN_WINDOW_CLOSED");
    expect(after.body.error.message).toContain("closed");

    // Post-lock time sampling: hold FOR UPDATE at ends_at - 1s, advance clock past ends_at, release lock -> 409 CHECKIN_WINDOW_CLOSED
    fakeNow = new Date("2026-12-15T11:59:59.000Z");
    const lockClient = await pool.connect();
    try {
      await lockClient.query("BEGIN");
      const pidRes = await lockClient.query<{ pid: number }>("SELECT pg_backend_pid() AS pid");
      await lockClient.query("SELECT id FROM workshops WHERE id = $1 FOR UPDATE", [wsId]);

      const checkinPromise = request(app)
        .post(`/api/v1/organizer/workshops/${wsId}/registrations/${regId}/check-in`)
        .set("Origin", origin)
        .set("Cookie", orgCookie)
        .send({})
        .then(r => r);

      await waitUntilBlockedOnWorkshopsLock(pidRes.rows[0]!.pid, 1);
      fakeNow = new Date("2026-12-15T12:00:01.000Z");
      await lockClient.query("COMMIT");

      const res = await checkinPromise;
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("CHECKIN_WINDOW_CLOSED");
    } finally {
      await lockClient.query("ROLLBACK").catch(() => undefined);
      lockClient.release();
    }

    const dbRow = await pool.query("SELECT checked_in_at FROM registrations WHERE id = $1", [regId]);
    expect(dbRow.rows[0].checked_in_at).toBeNull();
  });

  it("STS-F08-04: rejects CANCELLED registration (409 INVALID_STATE), DRAFT workshop (409 INVALID_STATE), and cross-workshop registration (404 NOT_FOUND)", async () => {
    const wsA = await seedWorkshop({ title: "Workshop A" });
    const wsB = await seedWorkshop({ title: "Workshop B" });
    const draftWs = await seedWorkshop({ title: "Draft Workshop", status: "DRAFT" });
    const cancelledReg = await seedRegistration(wsA, ids.participantA, "CANCELLED");
    const regOnB = await seedRegistration(wsB, ids.participantB, "ACTIVE");
    const regOnDraft = await seedRegistration(draftWs, ids.participantC, "ACTIVE");
    const orgCookie = await login(emails.organizerA);

    const resCancelled = await request(app)
      .post(`/api/v1/organizer/workshops/${wsA}/registrations/${cancelledReg}/check-in`)
      .set("Origin", origin)
      .set("Cookie", orgCookie)
      .send({});
    expect(resCancelled.status).toBe(409);
    expect(resCancelled.body.error.code).toBe("INVALID_STATE");

    const resDraft = await request(app)
      .post(`/api/v1/organizer/workshops/${draftWs}/registrations/${regOnDraft}/check-in`)
      .set("Origin", origin)
      .set("Cookie", orgCookie)
      .send({});
    expect(resDraft.status).toBe(409);
    expect(resDraft.body.error.code).toBe("INVALID_STATE");

    const resWrongWs = await request(app)
      .post(`/api/v1/organizer/workshops/${wsA}/registrations/${regOnB}/check-in`)
      .set("Origin", origin)
      .set("Cookie", orgCookie)
      .send({});
    expect(resWrongWs.status).toBe(404);
    expect(resWrongWs.body.error.code).toBe("NOT_FOUND");

    const dbCheck = await pool.query(
      "SELECT count(*)::int AS checked FROM registrations WHERE checked_in_at IS NOT NULL"
    );
    expect(dbCheck.rows[0].checked).toBe(0);
  });

  it("STS-F08-05: enforces F-05/F-08 cross-feature integrity across post-check-in cancel, custom-deadline gap, and controlled starts_at lock-order fixtures", async () => {
    const orgCookie = await login(emails.organizerA);
    const partACookie = await login(emails.participantA);

    // (a) Post-check-in cancellation returns 409 ALREADY_CHECKED_IN
    const wsA = await seedWorkshop({
      startsAt: "2026-12-15T10:00:00.000000Z",
      endsAt: "2026-12-15T12:00:00.000000Z",
      deadline: null
    });
    const regA = await seedRegistration(wsA, ids.participantA, "ACTIVE");
    fakeNow = new Date("2026-12-15T10:00:00.000Z");
    const ciA = await request(app)
      .post(`/api/v1/organizer/workshops/${wsA}/registrations/${regA}/check-in`)
      .set("Origin", origin).set("Cookie", orgCookie).send({});
    expect(ciA.status).toBe(200);

    const cancelAfterCheckIn = await request(app)
      .post(`/api/v1/me/registrations/${regA}/cancel`)
      .set("Origin", origin).set("Cookie", partACookie).send({});
    expect(cancelAfterCheckIn.status).toBe(409);
    expect(cancelAfterCheckIn.body.error.code).toBe("ALREADY_CHECKED_IN");

    // (b) Custom earlier deadline gap [registration_deadline, starts_at): BOTH cancel and check-in fail with 409
    const wsGap = await seedWorkshop({
      startsAt: "2026-12-15T10:00:00.000000Z",
      endsAt: "2026-12-15T12:00:00.000000Z",
      deadline: "2026-12-15T09:00:00.000000Z"
    });
    const regGap = await seedRegistration(wsGap, ids.participantA, "ACTIVE");
    fakeNow = new Date("2026-12-15T09:30:00.000Z");
    const [gapCancel, gapCheckIn] = await Promise.all([
      request(app).post(`/api/v1/me/registrations/${regGap}/cancel`).set("Origin", origin).set("Cookie", partACookie).send({}),
      request(app).post(`/api/v1/organizer/workshops/${wsGap}/registrations/${regGap}/check-in`).set("Origin", origin).set("Cookie", orgCookie).send({})
    ]);
    expect(gapCancel.status).toBe(409);
    expect(gapCancel.body.error.code).toBe("CANCELLATION_DEADLINE_PASSED");
    expect(gapCheckIn.status).toBe(409);
    expect(gapCheckIn.body.error.code).toBe("CHECKIN_WINDOW_CLOSED");
    const gapDb = await pool.query("SELECT status, checked_in_at, cancelled_at FROM registrations WHERE id = $1", [regGap]);
    expect(gapDb.rows[0].status).toBe("ACTIVE");
    expect(gapDb.rows[0].checked_in_at).toBeNull();
    expect(gapDb.rows[0].cancelled_at).toBeNull();

    // (c1) Controlled boundary (registration_deadline = null, now = starts_at - 1s): cancel wins 200, check-in returns 409
    const wsC1 = await seedWorkshop({
      startsAt: "2026-12-15T10:00:00.000000Z",
      endsAt: "2026-12-15T12:00:00.000000Z",
      deadline: null
    });
    const regC1 = await seedRegistration(wsC1, ids.participantA, "ACTIVE");
    fakeNow = new Date("2026-12-15T09:59:59.000Z");
    const [c1Cancel, c1CheckIn] = await Promise.all([
      request(app).post(`/api/v1/me/registrations/${regC1}/cancel`).set("Origin", origin).set("Cookie", partACookie).send({}),
      request(app).post(`/api/v1/organizer/workshops/${wsC1}/registrations/${regC1}/check-in`).set("Origin", origin).set("Cookie", orgCookie).send({})
    ]);
    expect(c1Cancel.status).toBe(200);
    expect(c1CheckIn.status).toBe(409);
    expect(["CHECKIN_WINDOW_CLOSED", "INVALID_STATE"]).toContain(c1CheckIn.body.error.code);

    // (c2) Lock-order fixture (registration_deadline = null): hold FOR UPDATE at starts_at - 1s, queue both cancel & check-in,
    // advance clock to exact starts_at, release lock -> check-in wins 200, cancel fails 409
    const wsC2 = await seedWorkshop({
      startsAt: "2026-12-15T10:00:00.000000Z",
      endsAt: "2026-12-15T12:00:00.000000Z",
      deadline: null
    });
    const regC2 = await seedRegistration(wsC2, ids.participantA, "ACTIVE");
    fakeNow = new Date("2026-12-15T09:59:59.000Z");
    const lockClient = await pool.connect();
    try {
      await lockClient.query("BEGIN");
      const pidRes = await lockClient.query<{ pid: number }>("SELECT pg_backend_pid() AS pid");
      await lockClient.query("SELECT id FROM workshops WHERE id = $1 FOR UPDATE", [wsC2]);

      const cancelPromise = request(app)
        .post(`/api/v1/me/registrations/${regC2}/cancel`)
        .set("Origin", origin).set("Cookie", partACookie).send({}).then(r => r);
      const checkinPromise = request(app)
        .post(`/api/v1/organizer/workshops/${wsC2}/registrations/${regC2}/check-in`)
        .set("Origin", origin).set("Cookie", orgCookie).send({}).then(r => r);

      await waitUntilBlockedOnWorkshopsLock(pidRes.rows[0]!.pid, 2);
      fakeNow = new Date("2026-12-15T10:00:00.000Z");
      await lockClient.query("COMMIT");

      const [c2Cancel, c2CheckIn] = await Promise.all([cancelPromise, checkinPromise]);
      expect(c2CheckIn.status).toBe(200);
      expect(c2Cancel.status).toBe(409);
      expect(["ALREADY_CHECKED_IN", "CANCELLATION_DEADLINE_PASSED"]).toContain(c2Cancel.body.error.code);
    } finally {
      await lockClient.query("ROLLBACK").catch(() => undefined);
      lockClient.release();
    }

    // Strict invariant: zero rows ever have both status = 'CANCELLED' and checked_in_at IS NOT NULL
    const violated = await pool.query(
      "SELECT count(*)::int AS bad FROM registrations WHERE status = 'CANCELLED' AND checked_in_at IS NOT NULL"
    );
    expect(violated.rows[0].bad).toBe(0);
  });

  it("STS-F08-06: enforces 401 anonymous, 403 Participant, 404 foreign Organizer, 403 FORBIDDEN_ORIGIN, and invalid numeric IDs with zero DB mutation", async () => {
    const wsId = await seedWorkshop();
    const regId = await seedRegistration(wsId, ids.participantA, "ACTIVE");
    const orgACookie = await login(emails.organizerA);
    const orgBCookie = await login(emails.organizerB);
    const partCookie = await login(emails.participantA);

    const anon = await request(app)
      .post(`/api/v1/organizer/workshops/${wsId}/registrations/${regId}/check-in`)
      .set("Origin", origin).send({});
    expect(anon.status).toBe(401);

    const participant = await request(app)
      .post(`/api/v1/organizer/workshops/${wsId}/registrations/${regId}/check-in`)
      .set("Origin", origin).set("Cookie", partCookie).send({});
    expect(participant.status).toBe(403);

    const foreign = await request(app)
      .post(`/api/v1/organizer/workshops/${wsId}/registrations/${regId}/check-in`)
      .set("Origin", origin).set("Cookie", orgBCookie).send({});
    expect(foreign.status).toBe(404);

    const badOrigin = await request(app)
      .post(`/api/v1/organizer/workshops/${wsId}/registrations/${regId}/check-in`)
      .set("Origin", "https://evil.example.test").set("Cookie", orgACookie).send({});
    expect(badOrigin.status).toBe(403);
    expect(badOrigin.body.error.code).toBe("FORBIDDEN_ORIGIN");

    const badWsId = await request(app)
      .post(`/api/v1/organizer/workshops/abc/registrations/${regId}/check-in`)
      .set("Origin", origin).set("Cookie", orgACookie).send({});
    expect(badWsId.status).toBe(404);

    const badRegId = await request(app)
      .post(`/api/v1/organizer/workshops/${wsId}/registrations/abc/check-in`)
      .set("Origin", origin).set("Cookie", orgACookie).send({});
    expect(badRegId.status).toBe(404);

    const dbRow = await pool.query("SELECT checked_in_at FROM registrations WHERE id = $1", [regId]);
    expect(dbRow.rows[0].checked_in_at).toBeNull();
  });

  it("STS-F08-07: checked_in_at persists across a real API process restart in both Organizer roster and Participant views", async () => {
    const nowReal = new Date();
    const startsAt = new Date(nowReal.getTime() - 15 * 60_000).toISOString();
    const endsAt = new Date(nowReal.getTime() + 60 * 60_000).toISOString();
    const wsId = await seedWorkshop({ startsAt, endsAt, deadline: null });
    const regId = await seedRegistration(wsId, ids.participantA, "ACTIVE");

    const port = await reserveLocalPort();
    const processOrigin = `http://localhost:${port}`;
    let apiProc: ChildProcess | undefined;

    try {
      apiProc = await startApiProcess(port, processOrigin);
      const loginAs = async (email: string) => {
        const res = await fetch(`${processOrigin}/api/v1/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Origin: processOrigin },
          body: JSON.stringify({ email, password })
        });
        expect(res.status).toBe(200);
        return (res.headers.get("set-cookie") ?? "").split(";")[0]!;
      };
      const orgCookie = await loginAs(emails.organizerA);
      const partCookie = await loginAs(emails.participantA);

      const checkinRes = await fetch(
        `${processOrigin}/api/v1/organizer/workshops/${wsId}/registrations/${regId}/check-in`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Origin: processOrigin, Cookie: orgCookie },
          body: "{}"
        }
      );
      expect(checkinRes.status).toBe(200);
      const checkinBody = await checkinRes.json() as { data: { checked_in_at: string } };
      expect(checkinBody.data.checked_in_at).toMatch(/Z$/);

      // Restart real API process
      await stopApiProcess(apiProc);
      apiProc = await startApiProcess(port, processOrigin);

      const rosterRes = await fetch(`${processOrigin}/api/v1/organizer/workshops/${wsId}/registrations`, {
        headers: { Origin: processOrigin, Cookie: orgCookie }
      });
      expect(rosterRes.status).toBe(200);
      const rosterBody = await rosterRes.json() as { data: Array<{ registration_id: string; checked_in_at: string | null }> };
      expect(rosterBody.data[0]?.checked_in_at).toBe(checkinBody.data.checked_in_at);

      const meRes = await fetch(`${processOrigin}/api/v1/me/registrations`, {
        headers: { Origin: processOrigin, Cookie: partCookie }
      });
      expect(meRes.status).toBe(200);
      const meBody = await meRes.json() as { data: Array<{ registration_id: string; checked_in_at: string | null }> };
      expect(meBody.data[0]?.checked_in_at).toBe(checkinBody.data.checked_in_at);
    } finally {
      await stopApiProcess(apiProc);
    }
  });

  it("R-02: malformed JSON on F-08 check-in returns 400 VALIDATION with Cache-Control: no-store", async () => {
    const wsId = await seedWorkshop({
      startsAt: "2026-12-15T10:00:00.000Z",
      endsAt: "2026-12-15T12:00:00.000Z",
      deadline: null
    });
    const regId = await seedRegistration(wsId, ids.participantA, "ACTIVE");
    fakeNow = new Date("2026-12-15T10:30:00.000Z");
    const cookieOrg = await login(emails.organizerA);

    const badJson = await request(app)
      .post(`/api/v1/organizer/workshops/${wsId}/registrations/${regId}/check-in`)
      .set("Cookie", cookieOrg)
      .set("Origin", origin)
      .set("Content-Type", "application/json")
      .send("{invalid-json");
    expect(badJson.status).toBe(400);
    expect(badJson.body.error?.code).toBe("VALIDATION");
    expect(badJson.headers["cache-control"]).toBe("no-store");

    const dbRow = await pool.query<{ checked_in_at: Date | null }>(
      "SELECT checked_in_at FROM registrations WHERE id=$1", [regId]
    );
    expect(dbRow.rows[0]?.checked_in_at).toBeNull();
  });
});
