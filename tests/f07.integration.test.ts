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
const password = "synthetic-f07-password-not-for-production";
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
  participantA: "f07.participant.a@example.test",
  participantB: "f07.participant.b@example.test",
  participantC: "f07.participant.c@example.test",
  participantD: "f07.participant.d@example.test",
  organizerA: "f07.organizer.a@example.test",
  organizerB: "f07.organizer.b@example.test"
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
  description?: string;
  location?: string;
  capacity?: number;
  startsAt?: string;
  endsAt?: string;
  deadline?: string | null;
  status?: "DRAFT" | "PUBLISHED";
  registrationClosed?: boolean;
} = {}): Promise<string> {
  const result = await pool.query(
    "INSERT INTO workshops (owner_user_id,title,description,location,starts_at,ends_at,capacity,registration_deadline,status,registration_closed) " +
    "VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id",
    [
      options.ownerId ?? ids.organizerA,
      options.title ?? "F07 Workshop",
      options.description ?? "F07 initial description",
      options.location ?? "Room F07",
      options.startsAt ?? "2026-12-15T10:00:00Z",
      options.endsAt ?? "2026-12-15T12:00:00Z",
      options.capacity ?? 5,
      options.deadline === undefined ? "2026-12-14T18:00:00Z" : options.deadline,
      options.status ?? "PUBLISHED",
      options.registrationClosed ?? false
    ]
  );
  return String(result.rows[0].id);
}

async function seedRegistration(workshopId: string, participantId: string, status: "ACTIVE" | "CANCELLED" = "ACTIVE") {
  await pool.query(
    "INSERT INTO registrations (workshop_id, participant_user_id, status, cancelled_at) VALUES ($1,$2,$3,$4)",
    [workshopId, participantId, status, status === "CANCELLED" ? new Date("2026-11-23T09:00:00Z") : null]
  );
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
    const timeout = setTimeout(() => { void fail("Timed out waiting for F-07 API process"); }, 15000);
    child.stdout?.setEncoding("utf8").on("data", (chunk: string) => {
      output += chunk;
      if (!settled && output.includes(`localhost:${port}`)) {
        settled = true;
        clearTimeout(timeout);
        resolvePromise(child);
      }
    });
    child.stderr?.setEncoding("utf8").on("data", (chunk: string) => { output += chunk; });
    child.once("error", error => { void fail(`Failed to spawn F-07 API: ${error.message}`); });
    child.once("exit", (code, signal) => {
      if (!settled) void fail(`F-07 API exited early (${code}/${signal})`);
    });
  });
}

beforeAll(async () => {
  await assertTestDatabase(pool);
  await migrate(pool);
});

beforeEach(async () => {
  fakeNow = new Date("2026-11-23T10:00:00.000Z");
  await pool.query("TRUNCATE TABLE registrations, workshops, sessions, users RESTART IDENTITY CASCADE");
  const passwordHash = await hashPassword(password);
  const result = await pool.query(
    "INSERT INTO users(email,password_hash,role) VALUES " +
    "($1,$7,'PARTICIPANT'),($2,$7,'PARTICIPANT'),($3,$7,'PARTICIPANT'),($4,$7,'PARTICIPANT')," +
    "($5,$7,'ORGANIZER'),($6,$7,'ORGANIZER') RETURNING id,email",
    [
      emails.participantA, emails.participantB, emails.participantC, emails.participantD,
      emails.organizerA, emails.organizerB, passwordHash
    ]
  );
  const byEmail = new Map<string, string>(result.rows.map(r => [r.email as string, String(r.id)]));
  ids = {
    participantA: byEmail.get(emails.participantA)!,
    participantB: byEmail.get(emails.participantB)!,
    participantC: byEmail.get(emails.participantC)!,
    participantD: byEmail.get(emails.participantD)!,
    organizerA: byEmail.get(emails.organizerA)!,
    organizerB: byEmail.get(emails.organizerB)!
  };
});

afterAll(async () => {
  await pool.end();
});

describe("F-07 Published Workshop Editing & Atomic Capacity Guard (PostgreSQL integration)", () => {
  it("STS-F07-01: owning Organizer edits metadata and deadline of PUBLISHED workshop; Participant discovery reflects updates", async () => {
    const workshopId = await seedWorkshop();
    const orgCookie = await login(emails.organizerA);
    const partCookie = await login(emails.participantA);

    const patch = await request(app)
      .patch(`/api/v1/organizer/workshops/${workshopId}`)
      .set("Origin", origin)
      .set("Cookie", orgCookie)
      .send({
        title: "  Updated F07 Workshop  ",
        description: "Updated published description",
        location: "Auditorium B",
        registration_deadline: "2026-12-13T17:00:00+07:00"
      });
    expect(patch.status).toBe(200);
    expect(patch.body.data.title).toBe("Updated F07 Workshop");
    expect(patch.body.data.description).toBe("Updated published description");
    expect(patch.body.data.location).toBe("Auditorium B");
    expect(patch.body.data.status).toBe("PUBLISHED");
    expect(new Date(patch.body.data.registration_deadline).toISOString()).toBe("2026-12-13T10:00:00.000Z");

    const discovery = await request(app)
      .get(`/api/v1/workshops/${workshopId}`)
      .set("Origin", origin)
      .set("Cookie", partCookie);
    expect(discovery.status).toBe(200);
    expect(discovery.body.data.title).toBe("Updated F07 Workshop");
    expect(discovery.body.data.description).toBe("Updated published description");
    expect(discovery.body.data.location).toBe("Auditorium B");
    expect(new Date(discovery.body.data.registration_deadline).toISOString()).toBe("2026-12-13T10:00:00.000Z");

    // Also allow resetting registration_deadline to null (default to starts_at)
    const clearDeadline = await request(app)
      .patch(`/api/v1/organizer/workshops/${workshopId}`)
      .set("Origin", origin)
      .set("Cookie", orgCookie)
      .send({ registration_deadline: null });
    expect(clearDeadline.status).toBe(200);
    expect(clearDeadline.body.data.registration_deadline).toBeNull();
  });

  it("STS-F07-02: allows reducing capacity down to exact active_count boundary and increasing capacity without auto-reopening manual closure", async () => {
    const workshopId = await seedWorkshop({ capacity: 5 });
    await seedRegistration(workshopId, ids.participantA, "ACTIVE");
    await seedRegistration(workshopId, ids.participantB, "ACTIVE");
    const orgCookie = await login(emails.organizerA);
    const partCookie = await login(emails.participantC);

    // Organizer detail exposes authoritative active_registrations_count
    const detail = await request(app)
      .get(`/api/v1/organizer/workshops/${workshopId}`)
      .set("Origin", origin)
      .set("Cookie", orgCookie);
    expect(detail.status).toBe(200);
    expect(detail.body.data.active_registrations_count).toBe(2);

    // Reduce to exact boundary capacity === active_count (2)
    const exact = await request(app)
      .patch(`/api/v1/organizer/workshops/${workshopId}`)
      .set("Origin", origin)
      .set("Cookie", orgCookie)
      .send({ capacity: 2 });
    expect(exact.status).toBe(200);
    expect(exact.body.data.capacity).toBe(2);

    const discFull = await request(app)
      .get(`/api/v1/workshops/${workshopId}`)
      .set("Origin", origin)
      .set("Cookie", partCookie);
    expect(discFull.status).toBe(200);
    expect(discFull.body.data.remaining_seats).toBe(0);
    expect(discFull.body.data.registration_open).toBe(false);

    // Increase capacity to 10
    const increased = await request(app)
      .patch(`/api/v1/organizer/workshops/${workshopId}`)
      .set("Origin", origin)
      .set("Cookie", orgCookie)
      .send({ capacity: 10 });
    expect(increased.status).toBe(200);
    expect(increased.body.data.capacity).toBe(10);

    const discOpen = await request(app)
      .get(`/api/v1/workshops/${workshopId}`)
      .set("Origin", origin)
      .set("Cookie", partCookie);
    expect(discOpen.status).toBe(200);
    expect(discOpen.body.data.remaining_seats).toBe(8);
    expect(discOpen.body.data.registration_open).toBe(true);

    // DEC-08 §3: Increasing capacity on a manually closed workshop never auto-reopens registration_closed
    const closedWorkshopId = await seedWorkshop({ capacity: 4, registrationClosed: true });
    const bumpClosed = await request(app)
      .patch(`/api/v1/organizer/workshops/${closedWorkshopId}`)
      .set("Origin", origin)
      .set("Cookie", orgCookie)
      .send({ capacity: 12 });
    expect(bumpClosed.status).toBe(200);
    expect(bumpClosed.body.data.capacity).toBe(12);
    expect(bumpClosed.body.data.registration_closed).toBe(true);
  });

  it("STS-F07-03: rejects capacity < active_count with 409 CAPACITY_BELOW_ACTIVE while excluding CANCELLED rows from active_count", async () => {
    const workshopId = await seedWorkshop({ capacity: 5 });
    await seedRegistration(workshopId, ids.participantA, "ACTIVE");
    await seedRegistration(workshopId, ids.participantB, "ACTIVE");
    await seedRegistration(workshopId, ids.participantC, "CANCELLED");
    await seedRegistration(workshopId, ids.participantD, "CANCELLED");
    const orgCookie = await login(emails.organizerA);

    const below = await request(app)
      .patch(`/api/v1/organizer/workshops/${workshopId}`)
      .set("Origin", origin)
      .set("Cookie", orgCookie)
      .send({ capacity: 1 });
    expect(below.status).toBe(409);
    expect(below.body.error.code).toBe("CAPACITY_BELOW_ACTIVE");

    const dbAfterReject = await pool.query("SELECT capacity FROM workshops WHERE id = $1", [workshopId]);
    expect(dbAfterReject.rows[0].capacity).toBe(5);

    // 2 ACTIVE + 2 CANCELLED -> reducing to 2 succeeds because CANCELLED rows do not inflate active_count
    const equalActive = await request(app)
      .patch(`/api/v1/organizer/workshops/${workshopId}`)
      .set("Origin", origin)
      .set("Cookie", orgCookie)
      .send({ capacity: 2 });
    expect(equalActive.status).toBe(200);
    expect(equalActive.body.data.capacity).toBe(2);
  });

  it("STS-F07-04: concurrent capacity reduction and Participant registration serialize atomically so active_count <= capacity always holds", async () => {
    const orgCookie = await login(emails.organizerA);
    const partCookie = await login(emails.participantB);

    // Run multiple synchronized rounds to exercise interleavings under FOR UPDATE.
    // Assign distinct non-overlapping daily slots per round so BR-05b (DEC-14)
    // cross-workshop schedule-conflict checks do not reject later rounds for participantB.
    for (let round = 0; round < 5; round += 1) {
      const day = 15 + round;
      const deadlineDay = 14 + round;
      const workshopId = await seedWorkshop({
        capacity: 2,
        startsAt: `2026-12-${day}T10:00:00Z`,
        endsAt: `2026-12-${day}T12:00:00Z`,
        deadline: `2026-12-${deadlineDay}T18:00:00Z`
      });
      await seedRegistration(workshopId, ids.participantA, "ACTIVE");

      const [patchRes, regRes] = await Promise.all([
        request(app)
          .patch(`/api/v1/organizer/workshops/${workshopId}`)
          .set("Origin", origin)
          .set("Cookie", orgCookie)
          .send({ capacity: 1 }),
        request(app)
          .post(`/api/v1/workshops/${workshopId}/registrations`)
          .set("Origin", origin)
          .set("Cookie", partCookie)
          .send({})
      ]);

      const patchWon = patchRes.status === 200;
      const regWon = regRes.status === 201;
      expect(patchWon !== regWon).toBe(true);
      if (patchWon) {
        expect(regRes.status).toBe(409);
        expect(regRes.body.error.code).toBe("CAPACITY_FULL");
      } else {
        expect(patchRes.status).toBe(409);
        expect(patchRes.body.error.code).toBe("CAPACITY_BELOW_ACTIVE");
      }

      const verify = await pool.query(
        "SELECT w.capacity, (SELECT count(*)::int FROM registrations r WHERE r.workshop_id = w.id AND r.status = 'ACTIVE') AS active_count " +
        "FROM workshops w WHERE w.id = $1",
        [workshopId]
      );
      expect(verify.rows[0].active_count).toBeLessThanOrEqual(verify.rows[0].capacity);
    }
  });

  it("STS-F07-05: allows starts_at/ends_at update when active_count === 0 and now < starts_at, and rejects invalid chronological/timestamp combinations", async () => {
    const workshopId = await seedWorkshop({
      startsAt: "2026-12-15T10:00:00Z",
      endsAt: "2026-12-15T12:00:00Z",
      deadline: "2026-12-14T18:00:00Z"
    });
    const orgCookie = await login(emails.organizerA);

    // Valid schedule update
    const ok = await request(app)
      .patch(`/api/v1/organizer/workshops/${workshopId}`)
      .set("Origin", origin)
      .set("Cookie", orgCookie)
      .send({
        starts_at: "2026-12-16T09:00:00+07:00",
        ends_at: "2026-12-16T11:30:00+07:00"
      });
    expect(ok.status).toBe(200);
    expect(new Date(ok.body.data.starts_at).toISOString()).toBe("2026-12-16T02:00:00.000Z");
    expect(new Date(ok.body.data.ends_at).toISOString()).toBe("2026-12-16T04:30:00.000Z");

    // Invalid: ends_at <= starts_at
    const badOrder = await request(app)
      .patch(`/api/v1/organizer/workshops/${workshopId}`)
      .set("Origin", origin)
      .set("Cookie", orgCookie)
      .send({
        starts_at: "2026-12-16T12:00:00Z",
        ends_at: "2026-12-16T12:00:00Z"
      });
    expect(badOrder.status).toBe(400);
    expect(badOrder.body.error.code).toBe("VALIDATION");

    // Invalid: existing deadline (2026-12-14T18:00Z) > new starts_at (2026-12-14T10:00Z)
    const badDeadline = await request(app)
      .patch(`/api/v1/organizer/workshops/${workshopId}`)
      .set("Origin", origin)
      .set("Cookie", orgCookie)
      .send({
        starts_at: "2026-12-14T10:00:00Z",
        ends_at: "2026-12-14T12:00:00Z"
      });
    expect(badDeadline.status).toBe(400);
    expect(badDeadline.body.error.code).toBe("VALIDATION");

    // Invalid: timezone-naive ISO timestamp
    const naive = await request(app)
      .patch(`/api/v1/organizer/workshops/${workshopId}`)
      .set("Origin", origin)
      .set("Cookie", orgCookie)
      .send({ starts_at: "2026-12-17T10:00:00" });
    expect(naive.status).toBe(400);
    expect(naive.body.error.code).toBe("VALIDATION");

    // DB retains the last valid schedule
    const dbCheck = await pool.query("SELECT starts_at, ends_at FROM workshops WHERE id = $1", [workshopId]);
    expect(new Date(dbCheck.rows[0].starts_at).toISOString()).toBe("2026-12-16T02:00:00.000Z");
    expect(new Date(dbCheck.rows[0].ends_at).toISOString()).toBe("2026-12-16T04:30:00.000Z");
  });

  it("STS-F07-06: enforces 409 SCHEDULE_LOCKED (when active_count > 0 or now >= starts_at) and 409 WORKSHOP_ENDED (when now >= ends_at)", async () => {
    const orgCookie = await login(emails.organizerA);

    // (a) active_count > 0 blocks schedule change with 409 SCHEDULE_LOCKED, but allows location edit
    const withActiveId = await seedWorkshop({
      startsAt: "2026-12-15T10:00:00Z",
      endsAt: "2026-12-15T12:00:00Z"
    });
    await seedRegistration(withActiveId, ids.participantA, "ACTIVE");

    const lockedByActive = await request(app)
      .patch(`/api/v1/organizer/workshops/${withActiveId}`)
      .set("Origin", origin)
      .set("Cookie", orgCookie)
      .send({ starts_at: "2026-12-16T10:00:00Z" });
    expect(lockedByActive.status).toBe(409);
    expect(lockedByActive.body.error.code).toBe("SCHEDULE_LOCKED");

    const sameInstantWithLoc = await request(app)
      .patch(`/api/v1/organizer/workshops/${withActiveId}`)
      .set("Origin", origin)
      .set("Cookie", orgCookie)
      .send({ starts_at: "2026-12-15T10:00:00.000Z", location: "Room Active-OK" });
    expect(sameInstantWithLoc.status).toBe(200);
    expect(sameInstantWithLoc.body.data.location).toBe("Room Active-OK");

    // (b) 0 active rows, now >= starts_at and < ends_at -> schedule change 409 SCHEDULE_LOCKED, location edit 200
    const startedId = await seedWorkshop({
      startsAt: "2026-12-15T10:00:00Z",
      endsAt: "2026-12-15T12:00:00Z",
      deadline: null
    });
    fakeNow = new Date("2026-12-15T10:00:00.000Z");

    const lockedByStart = await request(app)
      .patch(`/api/v1/organizer/workshops/${startedId}`)
      .set("Origin", origin)
      .set("Cookie", orgCookie)
      .send({ ends_at: "2026-12-15T13:00:00Z" });
    expect(lockedByStart.status).toBe(409);
    expect(lockedByStart.body.error.code).toBe("SCHEDULE_LOCKED");

    const locWhileRunning = await request(app)
      .patch(`/api/v1/organizer/workshops/${startedId}`)
      .set("Origin", origin)
      .set("Cookie", orgCookie)
      .send({ location: "Room Running-OK" });
    expect(locWhileRunning.status).toBe(200);
    expect(locWhileRunning.body.data.location).toBe("Room Running-OK");

    // (c) now >= ends_at -> any edit returns 409 WORKSHOP_ENDED
    fakeNow = new Date("2026-12-15T12:00:00.000Z");
    const endedEdit = await request(app)
      .patch(`/api/v1/organizer/workshops/${startedId}`)
      .set("Origin", origin)
      .set("Cookie", orgCookie)
      .send({ title: "Should fail after end" });
    expect(endedEdit.status).toBe(409);
    expect(endedEdit.body.error.code).toBe("WORKSHOP_ENDED");

    const dbCheck = await pool.query("SELECT title FROM workshops WHERE id = $1", [startedId]);
    expect(dbCheck.rows[0].title).toBe("F07 Workshop");
  });

  it("STS-F07-07: rejects blank/null required published text, invalid capacities, and immutable field overrides with 400 VALIDATION", async () => {
    const workshopId = await seedWorkshop({ title: "Immutable Check", capacity: 5 });
    const orgCookie = await login(emails.organizerA);

    const badPayloads: Array<Record<string, unknown>> = [
      { title: "" },
      { description: "   " },
      { location: null },
      { capacity: 0 },
      { capacity: -3 },
      { capacity: 2.5 },
      { capacity: 2147483648 },
      { capacity: null },
      { status: "DRAFT" },
      { owner_user_id: ids.organizerB },
      { registration_closed: true },
      { id: "999" },
      { created_at: "2026-01-01T00:00:00Z" }
    ];

    for (const payload of badPayloads) {
      const res = await request(app)
        .patch(`/api/v1/organizer/workshops/${workshopId}`)
        .set("Origin", origin)
        .set("Cookie", orgCookie)
        .send(payload);
      expect(res.status, `payload=${JSON.stringify(payload)}`).toBe(400);
      expect(res.body.error.code, `payload=${JSON.stringify(payload)}`).toBe("VALIDATION");
    }

    const dbRow = await pool.query(
      "SELECT title, description, location, capacity, status, owner_user_id, registration_closed FROM workshops WHERE id = $1",
      [workshopId]
    );
    expect(dbRow.rows[0].title).toBe("Immutable Check");
    expect(dbRow.rows[0].capacity).toBe(5);
    expect(dbRow.rows[0].status).toBe("PUBLISHED");
    expect(String(dbRow.rows[0].owner_user_id)).toBe(ids.organizerA);
    expect(dbRow.rows[0].registration_closed).toBe(false);
  });

  it("STS-F07-08: enforces 401 anonymous, 403 Participant, 404 foreign Organizer, and 403 FORBIDDEN_ORIGIN with zero DB mutations", async () => {
    const workshopId = await seedWorkshop({ title: "Protected F07" });
    const orgACookie = await login(emails.organizerA);
    const orgBCookie = await login(emails.organizerB);
    const partCookie = await login(emails.participantA);

    const anon = await request(app)
      .patch(`/api/v1/organizer/workshops/${workshopId}`)
      .set("Origin", origin)
      .send({ title: "Anon" });
    expect(anon.status).toBe(401);

    const participant = await request(app)
      .patch(`/api/v1/organizer/workshops/${workshopId}`)
      .set("Origin", origin)
      .set("Cookie", partCookie)
      .send({ title: "Participant" });
    expect(participant.status).toBe(403);

    const foreign = await request(app)
      .patch(`/api/v1/organizer/workshops/${workshopId}`)
      .set("Origin", origin)
      .set("Cookie", orgBCookie)
      .send({ title: "Foreign" });
    expect(foreign.status).toBe(404);

    const badOrigin = await request(app)
      .patch(`/api/v1/organizer/workshops/${workshopId}`)
      .set("Origin", "https://evil.example.test")
      .set("Cookie", orgACookie)
      .send({ title: "Bad Origin" });
    expect(badOrigin.status).toBe(403);
    expect(badOrigin.body.error.code).toBe("FORBIDDEN_ORIGIN");

    const invalidId = await request(app)
      .patch("/api/v1/organizer/workshops/not-a-number")
      .set("Origin", origin)
      .set("Cookie", orgACookie)
      .send({ title: "Bad ID" });
    expect(invalidId.status).toBe(404);

    const dbRow = await pool.query("SELECT title FROM workshops WHERE id = $1", [workshopId]);
    expect(dbRow.rows[0].title).toBe("Protected F07");
  });

  it("R-01: metadata-only partial PATCH preserves exact PostgreSQL microsecond timestamps on a locked workshop, distinguishes omitted vs null deadline, and compares schedule at storage precision", async () => {
    const workshopId = await seedWorkshop({
      title: "Microsecond Workshop",
      location: "Room Micro-1",
      startsAt: "2026-12-15T10:00:00.123456Z",
      endsAt: "2026-12-15T12:00:00.654321Z",
      deadline: "2026-12-14T18:00:00.789123Z"
    });
    await seedRegistration(workshopId, ids.participantA, "ACTIVE");
    const orgCookie = await login(emails.organizerA);

    const readExactTimes = async () => {
      const r = await pool.query<{
        location: string;
        starts_us: string;
        ends_us: string;
        deadline_us: string | null;
      }>(
        "SELECT location, " +
        "to_char(starts_at AT TIME ZONE 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"') AS starts_us, " +
        "to_char(ends_at AT TIME ZONE 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"') AS ends_us, " +
        "CASE WHEN registration_deadline IS NULL THEN NULL ELSE " +
        "to_char(registration_deadline AT TIME ZONE 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"') END AS deadline_us " +
        "FROM workshops WHERE id = $1",
        [workshopId]
      );
      return r.rows[0]!;
    };

    // 1. Metadata-only PATCH omits starts_at, ends_at, registration_deadline -> zero microsecond truncation
    const locOnly = await request(app)
      .patch(`/api/v1/organizer/workshops/${workshopId}`)
      .set("Origin", origin)
      .set("Cookie", orgCookie)
      .send({ location: "Room Micro-2" });
    expect(locOnly.status).toBe(200);
    const afterLoc = await readExactTimes();
    expect(afterLoc.location).toBe("Room Micro-2");
    expect(afterLoc.starts_us).toBe("2026-12-15T10:00:00.123456Z");
    expect(afterLoc.ends_us).toBe("2026-12-15T12:00:00.654321Z");
    expect(afterLoc.deadline_us).toBe("2026-12-14T18:00:00.789123Z");

    // 2. Supplying millisecond-truncated starts_at (.123Z != .123456Z) on a locked workshop -> 409 SCHEDULE_LOCKED
    const truncatedStart = await request(app)
      .patch(`/api/v1/organizer/workshops/${workshopId}`)
      .set("Origin", origin)
      .set("Cookie", orgCookie)
      .send({ starts_at: "2026-12-15T10:00:00.123Z", location: "Room Should-Not-Save" });
    expect(truncatedStart.status).toBe(409);
    expect(truncatedStart.body.error.code).toBe("SCHEDULE_LOCKED");
    const afterReject = await readExactTimes();
    expect(afterReject.location).toBe("Room Micro-2");
    expect(afterReject.starts_us).toBe("2026-12-15T10:00:00.123456Z");

    // 3. Supplying exact microsecond instant (different offset) on a locked workshop -> unchanged -> 200, microseconds preserved
    const exactSameOffset = await request(app)
      .patch(`/api/v1/organizer/workshops/${workshopId}`)
      .set("Origin", origin)
      .set("Cookie", orgCookie)
      .send({ starts_at: "2026-12-15T17:00:00.123456+07:00", location: "Room Micro-3" });
    expect(exactSameOffset.status).toBe(200);
    const afterExact = await readExactTimes();
    expect(afterExact.location).toBe("Room Micro-3");
    expect(afterExact.starts_us).toBe("2026-12-15T10:00:00.123456Z");
    expect(afterExact.ends_us).toBe("2026-12-15T12:00:00.654321Z");
    expect(afterExact.deadline_us).toBe("2026-12-14T18:00:00.789123Z");

    // 4. Explicit registration_deadline: null clears deadline while keeping exact starts_at/ends_at microseconds
    const explicitNull = await request(app)
      .patch(`/api/v1/organizer/workshops/${workshopId}`)
      .set("Origin", origin)
      .set("Cookie", orgCookie)
      .send({ registration_deadline: null });
    expect(explicitNull.status).toBe(200);
    const afterNull = await readExactTimes();
    expect(afterNull.deadline_us).toBeNull();
    expect(afterNull.starts_us).toBe("2026-12-15T10:00:00.123456Z");
    expect(afterNull.ends_us).toBe("2026-12-15T12:00:00.654321Z");
  });

  it("R-03: samples now() AFTER acquiring FOR UPDATE lock so edits waiting across ends_at or starts_at fail closed with 409", async () => {
    const orgCookie = await login(emails.organizerA);

    const waitUntilPatchBlockedOnLock = async (lockerPid: number) => {
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        const res = await pool.query<{ waiting: number }>(
          "SELECT count(*)::int AS waiting FROM pg_stat_activity " +
          "WHERE datname = current_database() AND pid <> $1 AND wait_event_type = 'Lock' " +
          "AND query ILIKE '%FROM workshops%' AND query ILIKE '%FOR UPDATE%'",
          [lockerPid]
        );
        if ((res.rows[0]?.waiting ?? 0) > 0) return;
        await new Promise(resolveDelay => setTimeout(resolveDelay, 15));
      }
      throw new Error("Timed out waiting for PATCH transaction to block on workshops FOR UPDATE lock");
    };

    // 1. Crossing ends_at while blocked on FOR UPDATE -> 409 WORKSHOP_ENDED
    const endWsId = await seedWorkshop({
      location: "Before-End-Lock",
      startsAt: "2026-12-15T10:00:00.000000Z",
      endsAt: "2026-12-15T12:00:00.000000Z",
      deadline: null
    });
    fakeNow = new Date("2026-12-15T11:59:59.000Z");

    const lockClient1 = await pool.connect();
    try {
      await lockClient1.query("BEGIN");
      const pidRes = await lockClient1.query<{ pid: number }>("SELECT pg_backend_pid() AS pid");
      await lockClient1.query("SELECT id FROM workshops WHERE id = $1 FOR UPDATE", [endWsId]);

      const patchPromise = request(app)
        .patch(`/api/v1/organizer/workshops/${endWsId}`)
        .set("Origin", origin)
        .set("Cookie", orgCookie)
        .send({ location: "After-End-Lock" })
        .then(r => r);

      await waitUntilPatchBlockedOnLock(pidRes.rows[0]!.pid);
      // Advance clock to exact ends_at while PATCH is waiting for the row lock
      fakeNow = new Date("2026-12-15T12:00:00.000Z");
      await lockClient1.query("COMMIT");

      const res = await patchPromise;
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("WORKSHOP_ENDED");
      const dbRow = await pool.query("SELECT location FROM workshops WHERE id = $1", [endWsId]);
      expect(dbRow.rows[0].location).toBe("Before-End-Lock");
    } finally {
      await lockClient1.query("ROLLBACK").catch(() => undefined);
      lockClient1.release();
    }

    // 2. Crossing starts_at while blocked on FOR UPDATE for a schedule edit -> 409 SCHEDULE_LOCKED
    const startWsId = await seedWorkshop({
      location: "Before-Start-Lock",
      startsAt: "2026-12-15T10:00:00.000000Z",
      endsAt: "2026-12-15T12:00:00.000000Z",
      deadline: null
    });
    fakeNow = new Date("2026-12-15T09:59:59.000Z");

    const lockClient2 = await pool.connect();
    try {
      await lockClient2.query("BEGIN");
      const pidRes = await lockClient2.query<{ pid: number }>("SELECT pg_backend_pid() AS pid");
      await lockClient2.query("SELECT id FROM workshops WHERE id = $1 FOR UPDATE", [startWsId]);

      const patchPromise = request(app)
        .patch(`/api/v1/organizer/workshops/${startWsId}`)
        .set("Origin", origin)
        .set("Cookie", orgCookie)
        .send({ ends_at: "2026-12-15T13:00:00Z" })
        .then(r => r);

      await waitUntilPatchBlockedOnLock(pidRes.rows[0]!.pid);
      // Advance clock to exact starts_at while PATCH is waiting for the row lock
      fakeNow = new Date("2026-12-15T10:00:00.000Z");
      await lockClient2.query("COMMIT");

      const res = await patchPromise;
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("SCHEDULE_LOCKED");
      const dbRow = await pool.query("SELECT ends_at FROM workshops WHERE id = $1", [startWsId]);
      expect(new Date(dbRow.rows[0].ends_at).toISOString()).toBe("2026-12-15T12:00:00.000Z");
    } finally {
      await lockClient2.query("ROLLBACK").catch(() => undefined);
      lockClient2.release();
    }
  });

  it("STS-F07-09: edited PUBLISHED workshop persists across a real API process restart while DRAFT updates and double-publish 409 stay intact", async () => {
    const workshopId = await seedWorkshop({ title: "Before Restart", location: "Room Old", capacity: 4 });
    const draftId = await seedWorkshop({ title: "Draft Intact", status: "DRAFT", capacity: 3 });

    const port = await reserveLocalPort();
    const processOrigin = `http://localhost:${port}`;
    let apiProc: ChildProcess | undefined;

    try {
      apiProc = await startApiProcess(port, processOrigin);
      const loginRes = await fetch(`${processOrigin}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: processOrigin },
        body: JSON.stringify({ email: emails.organizerA, password })
      });
      expect(loginRes.status).toBe(200);
      const cookie = (loginRes.headers.get("set-cookie") ?? "").split(";")[0]!;

      // Update PUBLISHED workshop
      const editRes = await fetch(`${processOrigin}/api/v1/organizer/workshops/${workshopId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Origin: processOrigin, Cookie: cookie },
        body: JSON.stringify({ title: "After Restart", location: "Room New", capacity: 9 })
      });
      expect(editRes.status).toBe(200);

      // Verify DRAFT partial update still works and double-publish returns 409 INVALID_STATE
      const draftPatch = await fetch(`${processOrigin}/api/v1/organizer/workshops/${draftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Origin: processOrigin, Cookie: cookie },
        body: JSON.stringify({ location: "Draft Room 2" })
      });
      expect(draftPatch.status).toBe(200);

      const doublePub = await fetch(`${processOrigin}/api/v1/organizer/workshops/${workshopId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: processOrigin, Cookie: cookie },
        body: "{}"
      });
      expect(doublePub.status).toBe(409);

      // Real API process restart
      await stopApiProcess(apiProc);
      apiProc = await startApiProcess(port, processOrigin);

      const afterRes = await fetch(`${processOrigin}/api/v1/organizer/workshops/${workshopId}`, {
        headers: { Origin: processOrigin, Cookie: cookie }
      });
      expect(afterRes.status).toBe(200);
      const body = await afterRes.json() as { data: { title: string; location: string; capacity: number } };
      expect(body.data.title).toBe("After Restart");
      expect(body.data.location).toBe("Room New");
      expect(body.data.capacity).toBe(9);
    } finally {
      await stopApiProcess(apiProc);
    }
  });
});
