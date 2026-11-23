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
const password = "synthetic-f05-password-not-for-production";
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
  participantA: "f05.participant.a@example.test",
  participantB: "f05.participant.b@example.test",
  organizerA: "f05.organizer.a@example.test",
  organizerB: "f05.organizer.b@example.test"
};
let ids: Record<keyof typeof emails, string>;

async function login(email: string, targetApp = app): Promise<string> {
  const response = await request(targetApp)
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
    "VALUES ($1,'F05 Workshop','F05 synthetic workshop','Room F05',$2,$3,$4,$5,$6) RETURNING id",
    [
      options.ownerId ?? ids.organizerA,
      options.startsAt ?? "2026-12-10T10:00:00Z",
      options.endsAt ?? "2026-12-10T12:00:00Z",
      options.capacity ?? 2,
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
    const timeout = setTimeout(() => { void fail("Timed out waiting for F-05 API process"); }, 15000);
    child.stdout?.setEncoding("utf8").on("data", (chunk: string) => {
      output += chunk;
      if (!settled && output.includes(`localhost:${port}`)) {
        settled = true;
        clearTimeout(timeout);
        resolvePromise(child);
      }
    });
    child.stderr?.setEncoding("utf8").on("data", (chunk: string) => { output += chunk; });
    child.once("error", error => { void fail(`F-05 API spawn error: ${error.message}`); });
    child.once("exit", (code, signal) => {
      if (!settled) void fail(`F-05 API exited early (${code}/${signal})`);
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

describe("F-05 Registration Cancellation & Re-registration Integration", () => {
  it("STS-F05-01: timely self-cancellation persists CANCELLED + cancelled_at and frees one seat", async () => {
    const workshopId = await seedWorkshop({ capacity: 2 });
    const cookieA = await login(emails.participantA);

    const created = await request(app)
      .post(`/api/v1/workshops/${workshopId}/registrations`)
      .set("Origin", origin)
      .set("Cookie", cookieA)
      .send({});
    expect(created.status).toBe(201);
    const registrationId = String(created.body.data.id);

    const beforeDetail = await request(app)
      .get(`/api/v1/workshops/${workshopId}`)
      .set("Cookie", cookieA);
    expect(beforeDetail.body.data.remaining_seats).toBe(1);

    const cancelled = await request(app)
      .post(`/api/v1/me/registrations/${registrationId}/cancel`)
      .set("Origin", origin)
      .set("Cookie", cookieA)
      .send({});
    expect(cancelled.status).toBe(200);
    expect(cancelled.headers["cache-control"]).toBe("no-store");
    expect(cancelled.body.data).toMatchObject({
      registration_id: registrationId,
      workshop_id: workshopId,
      status: "CANCELLED"
    });
    expect(typeof cancelled.body.data.cancelled_at).toBe("string");
    expect(cancelled.body.data.cancelled_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    const dbRow = await pool.query(
      "SELECT status, cancelled_at FROM registrations WHERE id=$1",
      [registrationId]
    );
    expect(dbRow.rowCount).toBe(1);
    expect(dbRow.rows[0].status).toBe("CANCELLED");
    expect(dbRow.rows[0].cancelled_at).not.toBeNull();

    const afterDetail = await request(app)
      .get(`/api/v1/workshops/${workshopId}`)
      .set("Cookie", cookieA);
    expect(afterDetail.body.data.remaining_seats).toBe(2);
  });

  it("STS-F05-02: cancelling an already-CANCELLED registration returns 409 ALREADY_CANCELLED without altering cancelled_at", async () => {
    const workshopId = await seedWorkshop({ capacity: 2 });
    const cookieA = await login(emails.participantA);

    const created = await request(app)
      .post(`/api/v1/workshops/${workshopId}/registrations`)
      .set("Origin", origin)
      .set("Cookie", cookieA)
      .send({});
    const registrationId = String(created.body.data.id);

    const first = await request(app)
      .post(`/api/v1/me/registrations/${registrationId}/cancel`)
      .set("Origin", origin)
      .set("Cookie", cookieA)
      .send({});
    expect(first.status).toBe(200);
    const originalCancelledAt = first.body.data.cancelled_at;

    fakeNow = new Date("2026-11-23T11:00:00.000Z");
    const second = await request(app)
      .post(`/api/v1/me/registrations/${registrationId}/cancel`)
      .set("Origin", origin)
      .set("Cookie", cookieA)
      .send({});
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe("ALREADY_CANCELLED");

    const dbRows = await pool.query(
      "SELECT to_char(cancelled_at AT TIME ZONE 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"') AS cancelled_at FROM registrations WHERE id=$1",
      [registrationId]
    );
    expect(dbRows.rowCount).toBe(1);
    expect(dbRows.rows[0].cancelled_at).toBe(originalCancelledAt);
  });

  it("STS-F05-03: cancellation at or after effective deadline (explicit and default starts_at) returns 409 CANCELLATION_DEADLINE_PASSED", async () => {
    const cookieA = await login(emails.participantA);

    const explicitWorkshopId = await seedWorkshop({
      startsAt: "2026-12-10T10:00:00Z",
      endsAt: "2026-12-10T12:00:00Z",
      deadline: "2026-12-09T18:00:00Z"
    });
    const defaultWorkshopId = await seedWorkshop({
      startsAt: "2026-12-11T10:00:00Z",
      endsAt: "2026-12-11T12:00:00Z",
      deadline: null
    });

    const regExplicit = await request(app)
      .post(`/api/v1/workshops/${explicitWorkshopId}/registrations`)
      .set("Origin", origin)
      .set("Cookie", cookieA)
      .send({});
    const regDefault = await request(app)
      .post(`/api/v1/workshops/${defaultWorkshopId}/registrations`)
      .set("Origin", origin)
      .set("Cookie", cookieA)
      .send({});
    expect(regExplicit.status).toBe(201);
    expect(regDefault.status).toBe(201);

    // Exact equality on explicit deadline
    fakeNow = new Date("2026-12-09T18:00:00.000Z");
    const atExplicit = await request(app)
      .post(`/api/v1/me/registrations/${regExplicit.body.data.id}/cancel`)
      .set("Origin", origin)
      .set("Cookie", cookieA)
      .send({});
    expect(atExplicit.status).toBe(409);
    expect(atExplicit.body.error.code).toBe("CANCELLATION_DEADLINE_PASSED");

    // After explicit deadline
    fakeNow = new Date("2026-12-09T18:00:01.000Z");
    const afterExplicit = await request(app)
      .post(`/api/v1/me/registrations/${regExplicit.body.data.id}/cancel`)
      .set("Origin", origin)
      .set("Cookie", cookieA)
      .send({});
    expect(afterExplicit.status).toBe(409);
    expect(afterExplicit.body.error.code).toBe("CANCELLATION_DEADLINE_PASSED");

    // Exact equality on default deadline = starts_at
    fakeNow = new Date("2026-12-11T10:00:00.000Z");
    const atDefault = await request(app)
      .post(`/api/v1/me/registrations/${regDefault.body.data.id}/cancel`)
      .set("Origin", origin)
      .set("Cookie", cookieA)
      .send({});
    expect(atDefault.status).toBe(409);
    expect(atDefault.body.error.code).toBe("CANCELLATION_DEADLINE_PASSED");

    const unchanged = await pool.query(
      "SELECT status, cancelled_at FROM registrations WHERE id IN ($1, $2)",
      [regExplicit.body.data.id, regDefault.body.data.id]
    );
    expect(unchanged.rows).toEqual([
      { status: "ACTIVE", cancelled_at: null },
      { status: "ACTIVE", cancelled_at: null }
    ]);
  });

  it("STS-F05-04: re-registration after cancellation creates a new ACTIVE row while preserving CANCELLED history", async () => {
    const workshopId = await seedWorkshop({ capacity: 2 });
    const cookieA = await login(emails.participantA);

    const firstReg = await request(app)
      .post(`/api/v1/workshops/${workshopId}/registrations`)
      .set("Origin", origin)
      .set("Cookie", cookieA)
      .send({});
    expect(firstReg.status).toBe(201);
    const r1 = String(firstReg.body.data.id);

    const cancel = await request(app)
      .post(`/api/v1/me/registrations/${r1}/cancel`)
      .set("Origin", origin)
      .set("Cookie", cookieA)
      .send({});
    expect(cancel.status).toBe(200);

    const reReg = await request(app)
      .post(`/api/v1/workshops/${workshopId}/registrations`)
      .set("Origin", origin)
      .set("Cookie", cookieA)
      .send({});
    expect(reReg.status).toBe(201);
    const r2 = String(reReg.body.data.id);
    expect(r2).not.toBe(r1);
    expect(reReg.body.data.status).toBe("ACTIVE");

    // Duplicate ACTIVE still rejected (BR-05)
    const dup = await request(app)
      .post(`/api/v1/workshops/${workshopId}/registrations`)
      .set("Origin", origin)
      .set("Cookie", cookieA)
      .send({});
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe("DUPLICATE_ACTIVE");

    const rows = await pool.query(
      "SELECT id::text AS id, status, cancelled_at FROM registrations WHERE workshop_id=$1 AND participant_user_id=$2 ORDER BY id ASC",
      [workshopId, ids.participantA]
    );
    expect(rows.rowCount).toBe(2);
    expect(rows.rows[0].id).toBe(r1);
    expect(rows.rows[0].status).toBe("CANCELLED");
    expect(rows.rows[0].cancelled_at).not.toBeNull();
    expect(rows.rows[1].id).toBe(r2);
    expect(rows.rows[1].status).toBe("ACTIVE");
    expect(rows.rows[1].cancelled_at).toBeNull();
  });

  it("STS-F05-05: re-registration enforces full capacity, passed deadline, and 10-participant concurrent freed-seat race", async () => {
    const cookieA = await login(emails.participantA);
    const cookieB = await login(emails.participantB);

    // (a) Capacity taken by Participant B after A cancels
    const wFull = await seedWorkshop({ capacity: 1 });
    const regA = await request(app)
      .post(`/api/v1/workshops/${wFull}/registrations`)
      .set("Origin", origin).set("Cookie", cookieA).send({});
    expect(regA.status).toBe(201);
    const cancelA = await request(app)
      .post(`/api/v1/me/registrations/${regA.body.data.id}/cancel`)
      .set("Origin", origin).set("Cookie", cookieA).send({});
    expect(cancelA.status).toBe(200);

    const regB = await request(app)
      .post(`/api/v1/workshops/${wFull}/registrations`)
      .set("Origin", origin).set("Cookie", cookieB).send({});
    expect(regB.status).toBe(201);

    const reRegFull = await request(app)
      .post(`/api/v1/workshops/${wFull}/registrations`)
      .set("Origin", origin).set("Cookie", cookieA).send({});
    expect(reRegFull.status).toBe(409);
    expect(reRegFull.body.error.code).toBe("CAPACITY_FULL");

    // (b) Deadline passed after A cancels
    const wDeadline = await seedWorkshop({
      capacity: 2,
      startsAt: "2026-12-10T10:00:00Z",
      endsAt: "2026-12-10T12:00:00Z",
      deadline: "2026-12-09T18:00:00Z"
    });
    const regA2 = await request(app)
      .post(`/api/v1/workshops/${wDeadline}/registrations`)
      .set("Origin", origin).set("Cookie", cookieA).send({});
    expect(regA2.status).toBe(201);
    expect((await request(app)
      .post(`/api/v1/me/registrations/${regA2.body.data.id}/cancel`)
      .set("Origin", origin).set("Cookie", cookieA).send({})).status).toBe(200);

    fakeNow = new Date("2026-12-09T18:00:00.000Z");
    const reRegLate = await request(app)
      .post(`/api/v1/workshops/${wDeadline}/registrations`)
      .set("Origin", origin).set("Cookie", cookieA).send({});
    expect(reRegLate.status).toBe(409);
    expect(reRegLate.body.error.code).toBe("DEADLINE_PASSED");

    // (c) 10 concurrent Participants (Participant A re-registering + 9 others) race for the single freed seat
    fakeNow = new Date("2026-11-23T10:00:00.000Z");
    const wRace = await seedWorkshop({ capacity: 1 });
    const regRaceA = await request(app)
      .post(`/api/v1/workshops/${wRace}/registrations`)
      .set("Origin", origin).set("Cookie", cookieA).send({});
    expect(regRaceA.status).toBe(201);
    expect((await request(app)
      .post(`/api/v1/me/registrations/${regRaceA.body.data.id}/cancel`)
      .set("Origin", origin).set("Cookie", cookieA).send({})).status).toBe(200);

    const passwordHash = await hashPassword(password);
    const raceCookies = [cookieA, cookieB];
    for (let i = 1; i <= 8; i += 1) {
      const email = `f05.racer.${i}@example.test`;
      await pool.query(
        "INSERT INTO users(email,password_hash,role) VALUES($1,$2,'PARTICIPANT')",
        [email, passwordHash]
      );
      raceCookies.push(await login(email));
    }

    let releaseBarrier!: () => void;
    const barrier = new Promise<void>(resolveBarrier => { releaseBarrier = resolveBarrier; });
    const requests = raceCookies.map(async cookie => {
      await barrier;
      return request(app)
        .post(`/api/v1/workshops/${wRace}/registrations`)
        .set("Origin", origin)
        .set("Cookie", cookie)
        .send({});
    });
    releaseBarrier();
    const outcomes = await Promise.all(requests);
    const createdCount = outcomes.filter(res => res.status === 201).length;
    const conflictCount = outcomes.filter(res => res.status === 409 && res.body.error.code === "CAPACITY_FULL").length;
    expect(createdCount).toBe(1);
    expect(conflictCount).toBe(9);

    const activeCount = await pool.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM registrations WHERE workshop_id=$1 AND status='ACTIVE'",
      [wRace]
    );
    expect(activeCount.rows[0].count).toBe(1);
  });

  it("STS-F05-07: denies anonymous, Organizer, foreign Participant, bad Origin, malformed deadline, and checked-in rows", async () => {
    const workshopId = await seedWorkshop({ capacity: 2 });
    const cookieA = await login(emails.participantA);
    const cookieB = await login(emails.participantB);
    const cookieOrg = await login(emails.organizerA);

    const regA = await request(app)
      .post(`/api/v1/workshops/${workshopId}/registrations`)
      .set("Origin", origin).set("Cookie", cookieA).send({});
    expect(regA.status).toBe(201);
    const regId = String(regA.body.data.id);

    // Anonymous -> 401
    const anon = await request(app)
      .post(`/api/v1/me/registrations/${regId}/cancel`)
      .set("Origin", origin).send({});
    expect(anon.status).toBe(401);

    // Organizer -> 403
    const org = await request(app)
      .post(`/api/v1/me/registrations/${regId}/cancel`)
      .set("Origin", origin).set("Cookie", cookieOrg).send({});
    expect(org.status).toBe(403);

    // Missing / foreign Origin -> 403 FORBIDDEN_ORIGIN
    const badOrigin = await request(app)
      .post(`/api/v1/me/registrations/${regId}/cancel`)
      .set("Origin", "https://evil.example.test").set("Cookie", cookieA).send({});
    expect(badOrigin.status).toBe(403);
    expect(badOrigin.body.error.code).toBe("FORBIDDEN_ORIGIN");

    // Foreign Participant B -> identical safe 404 to missing ID
    const foreign = await request(app)
      .post(`/api/v1/me/registrations/${regId}/cancel`)
      .set("Origin", origin).set("Cookie", cookieB).send({});
    const missing = await request(app)
      .post("/api/v1/me/registrations/999999/cancel")
      .set("Origin", origin).set("Cookie", cookieB).send({});
    const malformed = await request(app)
      .post("/api/v1/me/registrations/not-a-number/cancel")
      .set("Origin", origin).set("Cookie", cookieA).send({});
    expect(foreign.status).toBe(404);
    expect(foreign.body).toEqual(missing.body);
    expect(malformed.status).toBe(404);

    // Seeded checked_in_at IS NOT NULL -> 409 ALREADY_CHECKED_IN
    await pool.query("UPDATE registrations SET checked_in_at = now() WHERE id = $1", [regId]);
    const checkedIn = await request(app)
      .post(`/api/v1/me/registrations/${regId}/cancel`)
      .set("Origin", origin).set("Cookie", cookieA).send({});
    expect(checkedIn.status).toBe(409);
    expect(checkedIn.body.error.code).toBe("ALREADY_CHECKED_IN");

    // Malformed persisted registration_deadline > starts_at -> 409 INVALID_DEADLINE
    await pool.query("UPDATE registrations SET checked_in_at = NULL WHERE id = $1", [regId]);
    await pool.query("ALTER TABLE workshops DROP CONSTRAINT published_deadline");
    try {
      await pool.query(
        "UPDATE workshops SET registration_deadline = starts_at + interval '1 hour' WHERE id = $1",
        [workshopId]
      );
      const invalidDeadline = await request(app)
        .post(`/api/v1/me/registrations/${regId}/cancel`)
        .set("Origin", origin).set("Cookie", cookieA).send({});
      expect(invalidDeadline.status).toBe(409);
      expect(invalidDeadline.body.error.code).toBe("INVALID_DEADLINE");
    } finally {
      await pool.query("UPDATE workshops SET registration_deadline = starts_at - interval '1 hour' WHERE id = $1", [workshopId]);
      await pool.query(
        "ALTER TABLE workshops ADD CONSTRAINT published_deadline CHECK (status = 'DRAFT' OR registration_deadline IS NULL OR registration_deadline <= starts_at)"
      );
    }

    const stillActive = await pool.query("SELECT status, cancelled_at FROM registrations WHERE id=$1", [regId]);
    expect(stillActive.rows[0]).toEqual({ status: "ACTIVE", cancelled_at: null });
  });

  it("STS-F05-08: list/roster return both r2 and r1 with cancelled_at & privacy, while detail returns only requested record", async () => {
    const workshopId = await seedWorkshop({ capacity: 3 });
    const cookieA = await login(emails.participantA);
    const cookieOrg = await login(emails.organizerA);

    const reg1 = await request(app)
      .post(`/api/v1/workshops/${workshopId}/registrations`)
      .set("Origin", origin).set("Cookie", cookieA).send({});
    expect(reg1.status).toBe(201);
    const r1 = String(reg1.body.data.id);

    const cancelled = await request(app)
      .post(`/api/v1/me/registrations/${r1}/cancel`)
      .set("Origin", origin).set("Cookie", cookieA).send({});
    expect(cancelled.status).toBe(200);
    const r1CancelledAt = cancelled.body.data.cancelled_at as string;

    const reg2 = await request(app)
      .post(`/api/v1/workshops/${workshopId}/registrations`)
      .set("Origin", origin).set("Cookie", cookieA).send({});
    expect(reg2.status).toBe(201);
    const r2 = String(reg2.body.data.id);

    // (a) List & Organizer roster return both r2 then r1 in registered_at DESC, id DESC order
    const list = await request(app).get("/api/v1/me/registrations").set("Cookie", cookieA);
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(2);
    expect(list.body.data[0]).toMatchObject({ registration_id: r2, status: "ACTIVE", cancelled_at: null });
    expect(list.body.data[1]).toMatchObject({ registration_id: r1, status: "CANCELLED", cancelled_at: r1CancelledAt });
    expect(list.body.pagination).toEqual({ next_cursor: null });

    const roster = await request(app)
      .get(`/api/v1/organizer/workshops/${workshopId}/registrations`)
      .set("Cookie", cookieOrg);
    expect(roster.status).toBe(200);
    expect(roster.body.data).toHaveLength(2);
    expect(roster.body.data[0]).toMatchObject({
      registration_id: r2, participant_id: ids.participantA, status: "ACTIVE", cancelled_at: null
    });
    expect(roster.body.data[1]).toMatchObject({
      registration_id: r1, participant_id: ids.participantA, status: "CANCELLED", cancelled_at: r1CancelledAt
    });
    // Strict WD-F04-01 privacy minimization preserved
    expect(Object.keys(roster.body.data[0]).sort()).toEqual(
      ["cancelled_at", "participant_id", "registered_at", "registration_id", "status"].sort()
    );
    expect(JSON.stringify(roster.body)).not.toContain(emails.participantA);

    // (b) Single-record detail returns ONLY the requested record (PR #74 R-01)
    const detailR1 = await request(app).get(`/api/v1/me/registrations/${r1}`).set("Cookie", cookieA);
    expect(detailR1.status).toBe(200);
    expect(Array.isArray(detailR1.body.data)).toBe(false);
    expect(detailR1.body.data).toMatchObject({
      registration_id: r1,
      status: "CANCELLED",
      cancelled_at: r1CancelledAt
    });
    expect(JSON.stringify(detailR1.body)).not.toContain(`"registration_id":"${r2}"`);

    const detailR2 = await request(app).get(`/api/v1/me/registrations/${r2}`).set("Cookie", cookieA);
    expect(detailR2.status).toBe(200);
    expect(Array.isArray(detailR2.body.data)).toBe(false);
    expect(detailR2.body.data).toMatchObject({
      registration_id: r2,
      status: "ACTIVE",
      cancelled_at: null
    });
    expect(JSON.stringify(detailR2.body)).not.toContain(`"registration_id":"${r1}"`);
  });

  it("STS-F05-09: cancelled record, freed seat, and re-registered ACTIVE row persist across a real API process restart", async () => {
    const port = await reserveLocalPort();
    const appOrigin = `http://localhost:${port}`;
    const workshopId = await seedWorkshop({ capacity: 1 });
    let child: ChildProcess | undefined;

    try {
      const procA = await startApiProcess(port, appOrigin);
      child = procA;
      const pidA = procA.pid;

      const loginP = await fetch(`${appOrigin}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: appOrigin },
        body: JSON.stringify({ email: emails.participantA, password })
      });
      expect(loginP.status).toBe(200);
      const cookieP = loginP.headers.get("set-cookie")!.split(";")[0]!;

      const loginOrg = await fetch(`${appOrigin}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: appOrigin },
        body: JSON.stringify({ email: emails.organizerA, password })
      });
      expect(loginOrg.status).toBe(200);
      const cookieOrg = loginOrg.headers.get("set-cookie")!.split(";")[0]!;

      const reg1Res = await fetch(`${appOrigin}/api/v1/workshops/${workshopId}/registrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: appOrigin, Cookie: cookieP },
        body: "{}"
      });
      expect(reg1Res.status).toBe(201);
      const r1 = String(((await reg1Res.json()) as { data: { id: string } }).data.id);

      const cancelRes = await fetch(`${appOrigin}/api/v1/me/registrations/${r1}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: appOrigin, Cookie: cookieP },
        body: "{}"
      });
      expect(cancelRes.status).toBe(200);
      const r1CancelledAt = ((await cancelRes.json()) as { data: { cancelled_at: string } }).data.cancelled_at;

      const reg2Res = await fetch(`${appOrigin}/api/v1/workshops/${workshopId}/registrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: appOrigin, Cookie: cookieP },
        body: "{}"
      });
      expect(reg2Res.status).toBe(201);
      const r2 = String(((await reg2Res.json()) as { data: { id: string } }).data.id);

      await stopApiProcess(procA);
      const procB = await startApiProcess(port, appOrigin);
      child = procB;
      expect(procB.pid).not.toBe(pidA);

      const listAfter = await fetch(`${appOrigin}/api/v1/me/registrations`, {
        headers: { Cookie: cookieP }
      });
      expect(listAfter.status).toBe(200);
      const listBody = (await listAfter.json()) as {
        data: Array<{ registration_id: string; status: string; cancelled_at: string | null }>;
      };
      expect(listBody.data).toHaveLength(2);
      expect(listBody.data[0]).toMatchObject({ registration_id: r2, status: "ACTIVE", cancelled_at: null });
      expect(listBody.data[1]).toMatchObject({ registration_id: r1, status: "CANCELLED", cancelled_at: r1CancelledAt });

      const rosterAfter = await fetch(`${appOrigin}/api/v1/organizer/workshops/${workshopId}/registrations`, {
        headers: { Cookie: cookieOrg }
      });
      expect(rosterAfter.status).toBe(200);
      const rosterBody = (await rosterAfter.json()) as {
        data: Array<{ registration_id: string; status: string; cancelled_at: string | null }>;
      };
      expect(rosterBody.data).toHaveLength(2);
      expect(rosterBody.data[0]).toMatchObject({ registration_id: r2, status: "ACTIVE", cancelled_at: null });
      expect(rosterBody.data[1]).toMatchObject({ registration_id: r1, status: "CANCELLED", cancelled_at: r1CancelledAt });
    } finally {
      await stopApiProcess(child);
    }
  }, 60000);
});
