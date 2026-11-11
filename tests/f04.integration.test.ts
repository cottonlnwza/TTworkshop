import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { Pool } from "pg";
import { createApp } from "../api/app.js";
import { hashPassword } from "../api/password.js";
import { migrate } from "../api/migrate.js";
import { requireTestDatabaseUrl, assertTestDatabase } from "./helpers/testDatabase.js";

const origin = "http://localhost:5173";
const password = "synthetic-f04-password-not-for-production";
const pool = new Pool({ connectionString: requireTestDatabaseUrl(process.env.PG_TEST_URL) });
const app = createApp(pool, { appOrigin: origin, production: false, sessionHours: 8 });
const emails = {
  participantA: "f04.participant.a@example.test",
  participantB: "f04.participant.b@example.test",
  organizerA: "f04.organizer.a@example.test",
  organizerB: "f04.organizer.b@example.test"
};
let ids: Record<keyof typeof emails, string>;
let publishedA: string;
let publishedB: string;
let draftA: string;

async function login(email: string): Promise<string> {
  const response = await request(app).post("/api/v1/auth/login").set("Origin", origin)
    .send({ email, password });
  expect(response.status).toBe(200);
  const header = response.headers["set-cookie"];
  const values = Array.isArray(header) ? header : header ? [header] : [];
  return values[0]?.split(";")[0] ?? "";
}

async function seedWorkshop(ownerId: string, status: "DRAFT" | "PUBLISHED" = "PUBLISHED"): Promise<string> {
  const result = await pool.query(
    "INSERT INTO workshops (owner_user_id,title,description,location,starts_at,ends_at,capacity,status) " +
    "VALUES ($1,$2,'F04 synthetic workshop','Room F04','2026-12-01T10:00:00Z'," +
    "'2026-12-01T11:00:00Z',100,$3) RETURNING id",
    [ownerId, "F04 " + status + " workshop", status]
  );
  return String(result.rows[0].id);
}

async function seedRegistration(workshopId: string, participantId: string, options: {
  status?: "ACTIVE" | "CANCELLED";
  registeredAt?: string;
} = {}): Promise<string> {
  const status = options.status ?? "ACTIVE";
  const result = await pool.query(
    "INSERT INTO registrations (workshop_id,participant_user_id,status,registered_at,cancelled_at) " +
    "VALUES ($1,$2,$3,$4,CASE WHEN $3::registration_status='CANCELLED' THEN $4::timestamptz ELSE NULL END) RETURNING id",
    [workshopId, participantId, status, options.registeredAt ?? "2026-11-01T00:00:00.000000Z"]
  );
  return String(result.rows[0].id);
}

beforeAll(async () => {
  await assertTestDatabase(pool);
  await migrate(pool);
});

beforeEach(async () => {
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
  publishedA = await seedWorkshop(ids.organizerA, "PUBLISHED");
  publishedB = await seedWorkshop(ids.organizerB, "PUBLISHED");
  draftA = await seedWorkshop(ids.organizerA, "DRAFT");
});

afterAll(async () => { await pool.end(); });

describe("F-04 Participant registration views", () => {
  it("STS-F04-01: Participant list returns only their persisted registrations and status", async () => {
    const own = await seedRegistration(publishedA, ids.participantA);
    await seedRegistration(publishedA, ids.participantB);
    const otherWorkshop = await seedWorkshop(ids.organizerB);
    await seedRegistration(otherWorkshop, ids.participantA, { status: "CANCELLED" });
    const response = await request(app).get("/api/v1/me/registrations")
      .set("Cookie", await login(emails.participantA));

    expect(response.status).toBe(200);
    expect(response.body.data.map((row: { registration_id: string }) => row.registration_id)).toContain(own);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.data.every((row: { registration_id: string; status: string }) =>
      row.registration_id && ["ACTIVE", "CANCELLED"].includes(row.status))).toBe(true);
    expect(JSON.stringify(response.body)).not.toContain(emails.participantB);
    expect(response.body).toHaveProperty("pagination.next_cursor", null);
    expect(response.body).not.toHaveProperty("total");
  });

  it("STS-F04-02: Participant detail returns their own persisted row and minimum Workshop summary", async () => {
    const registrationId = await seedRegistration(publishedA, ids.participantA);
    const response = await request(app).get("/api/v1/me/registrations/" + registrationId)
      .set("Cookie", await login(emails.participantA));

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      registration_id: registrationId,
      workshop: { workshop_id: publishedA, title: "F04 PUBLISHED workshop" },
      status: "ACTIVE"
    });
    expect(response.body.data).not.toHaveProperty("participant_user_id");
    expect(response.body.data).not.toHaveProperty("email");
  });

  it("STS-F04-03: foreign and missing private registration IDs have the same safe 404", async () => {
    const foreignId = await seedRegistration(publishedA, ids.participantB);
    const cookie = await login(emails.participantA);
    const foreign = await request(app).get("/api/v1/me/registrations/" + foreignId).set("Cookie", cookie);
    const missing = await request(app).get("/api/v1/me/registrations/999999").set("Cookie", cookie);

    expect(foreign.status).toBe(404);
    expect(foreign.body).toEqual(missing.body);
    expect(JSON.stringify(foreign.body)).not.toContain(ids.participantB);
  });

  it("STS-F04-09: Participant and Organizer views each show one persisted ACTIVE row without JOIN duplication", async () => {
    const registrationId = await seedRegistration(publishedA, ids.participantA);
    const participant = await request(app).get("/api/v1/me/registrations")
      .set("Cookie", await login(emails.participantA));
    const organizer = await request(app).get("/api/v1/organizer/workshops/" + publishedA + "/registrations")
      .set("Cookie", await login(emails.organizerA));

    expect(participant.status).toBe(200);
    expect(participant.body.data).toHaveLength(1);
    expect(participant.body.data[0].registration_id).toBe(registrationId);
    expect(participant.body.data[0].status).toBe("ACTIVE");
    expect(organizer.status).toBe(200);
    expect(organizer.body.data).toHaveLength(1);
    expect(organizer.body.data[0].registration_id).toBe(registrationId);
    expect(participant.headers["cache-control"]).toBe("no-store");
    expect(organizer.headers["cache-control"]).toBe("no-store");
  });
});

describe("F-04 Organizer registration roster", () => {
  it("STS-F04-04: Organizer sees only persisted registrations for their owned PUBLISHED Workshop", async () => {
    const own = await seedRegistration(publishedA, ids.participantA);
    await seedRegistration(publishedA, ids.participantB);
    const response = await request(app)
      .get("/api/v1/organizer/workshops/" + publishedA + "/registrations")
      .set("Cookie", await login(emails.organizerA));

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.data.map((row: { registration_id: string }) => row.registration_id)).toContain(own);
    expect(Object.keys(response.body.data[0]).sort()).toEqual(
      ["participant_id", "registered_at", "registration_id", "status"].sort()
    );
    expect(JSON.stringify(response.body)).not.toContain(emails.participantA);
    expect(JSON.stringify(response.body)).not.toContain(emails.participantB);
    expect(response.body).toHaveProperty("pagination.next_cursor", null);
  });

  it("STS-F04-05: foreign, missing and own DRAFT Workshop rosters return identical safe 404", async () => {
    const cookie = await login(emails.organizerA);
    const ownDraft = await request(app).get("/api/v1/organizer/workshops/" + draftA + "/registrations").set("Cookie", cookie);
    const foreign = await request(app).get("/api/v1/organizer/workshops/" + publishedB + "/registrations").set("Cookie", cookie);
    const missing = await request(app).get("/api/v1/organizer/workshops/999999/registrations").set("Cookie", cookie);
    const foreignWithInvalidLimit = await request(app)
      .get("/api/v1/organizer/workshops/" + publishedB + "/registrations?limit=51").set("Cookie", cookie);

    expect(ownDraft.status).toBe(404);
    expect(foreign.status).toBe(404);
    expect(ownDraft.body).toEqual(foreign.body);
    expect(foreign.body).toEqual(missing.body);
    expect(foreignWithInvalidLimit.status).toBe(404);
    expect(foreignWithInvalidLimit.body).toEqual(foreign.body);
    expect(JSON.stringify(foreign.body)).not.toContain(ids.organizerB);
  });

  it("STS-F04-06: anonymous and wrong-role requests receive safe 401/403 envelopes", async () => {
    const participant = await login(emails.participantA);
    const organizer = await login(emails.organizerA);
    const anonymousList = await request(app).get("/api/v1/me/registrations");
    const anonymousRoster = await request(app).get("/api/v1/organizer/workshops/" + publishedA + "/registrations");
    const organizerList = await request(app).get("/api/v1/me/registrations").set("Cookie", organizer);
    const participantRoster = await request(app)
      .get("/api/v1/organizer/workshops/" + publishedA + "/registrations").set("Cookie", participant);

    expect(anonymousList.status).toBe(401);
    expect(anonymousRoster.status).toBe(401);
    expect(organizerList.status).toBe(403);
    expect(participantRoster.status).toBe(403);
    for (const response of [anonymousList, anonymousRoster, organizerList, participantRoster]) {
      expect(response.body).toHaveProperty("error.code");
      expect(response.body).not.toHaveProperty("data");
      expect(JSON.stringify(response.body)).not.toContain(emails.participantA);
    }
  });
});

describe("F-04 stable cursor pagination", () => {
  it("STS-F04-10: both list endpoints enforce default 20, max 50, stable traversal and principal isolation", async () => {
    const passwordHash = await hashPassword(password);
    const participants = await pool.query(
      "INSERT INTO users(email,password_hash,role) " +
      "SELECT 'f04.roster.' || n || '@example.test',$1,'PARTICIPANT' " +
      "FROM generate_series(1,55) n RETURNING id",
      [passwordHash]
    );
    const rosterIds: string[] = [];
    for (const participant of participants.rows) {
      rosterIds.push(await seedRegistration(publishedA, String(participant.id), {
        registeredAt: "2026-11-01T00:00:00.000000Z"
      }));
    }

    const participantWorkshops = await pool.query(
      "INSERT INTO workshops(owner_user_id,title,description,location,starts_at,ends_at,capacity,status) " +
      "SELECT $1,'F04 page ' || n,'F04 page fixture','Room F04','2026-12-01T10:00:00Z'," +
      "'2026-12-01T11:00:00Z',100,'PUBLISHED' FROM generate_series(1,55) n RETURNING id",
      [ids.organizerA]
    );
    const ownRegistrationIds: string[] = [];
    for (const workshop of participantWorkshops.rows) {
      ownRegistrationIds.push(await seedRegistration(String(workshop.id), ids.participantA, {
        registeredAt: "2026-11-02T00:00:00.000000Z"
      }));
    }
    const laterRegistration = await seedRegistration(publishedB, ids.participantB, {
      registeredAt: "2026-10-30T00:00:00.000000Z"
    });

    const participantCookie = await login(emails.participantA);
    const organizerCookie = await login(emails.organizerA);
    const participantFirst = await request(app).get("/api/v1/me/registrations").set("Cookie", participantCookie);
    const rosterFirst = await request(app).get("/api/v1/organizer/workshops/" + publishedA + "/registrations")
      .set("Cookie", organizerCookie);
    expect(participantFirst.status).toBe(200);
    expect(participantFirst.body.data).toHaveLength(20);
    expect(rosterFirst.status).toBe(200);
    expect(rosterFirst.body.data).toHaveLength(20);
    expect(participantFirst.body).not.toHaveProperty("total");
    expect(rosterFirst.body).not.toHaveProperty("total");

    const participantMax = await request(app).get("/api/v1/me/registrations?limit=50").set("Cookie", participantCookie);
    const rosterMax = await request(app).get("/api/v1/organizer/workshops/" + publishedA + "/registrations?limit=50")
      .set("Cookie", organizerCookie);
    expect(participantMax.body.data).toHaveLength(50);
    expect(rosterMax.body.data).toHaveLength(50);

    const traverse = async (path: string, cookie: string): Promise<string[]> => {
      const found: string[] = [];
      let cursor: string | null = null;
      do {
        const requestUrl: string = cursor ? path + "?cursor=" + encodeURIComponent(cursor) : path;
        const pageResponse = await request(app).get(requestUrl).set("Cookie", cookie);
        expect(pageResponse.status).toBe(200);
        found.push(...pageResponse.body.data.map((row: { registration_id: string }) => row.registration_id));
        cursor = pageResponse.body.pagination.next_cursor as string | null;
      } while (cursor);
      return found;
    };
    const participantAll = await traverse("/api/v1/me/registrations", participantCookie);
    const rosterAll = await traverse("/api/v1/organizer/workshops/" + publishedA + "/registrations", organizerCookie);
    expect(participantAll).toHaveLength(55);
    expect(new Set(participantAll).size).toBe(55);
    expect(new Set(participantAll)).toEqual(new Set(ownRegistrationIds));
    expect(participantAll).toEqual([...ownRegistrationIds].reverse());
    expect(rosterAll).toHaveLength(55);
    expect(new Set(rosterAll).size).toBe(55);
    expect(new Set(rosterAll)).toEqual(new Set(rosterIds));
    expect(rosterAll).toEqual([...rosterIds].reverse());

    const badLimit = await request(app).get("/api/v1/me/registrations?limit=51").set("Cookie", participantCookie);
    const badRosterLimit = await request(app)
      .get("/api/v1/organizer/workshops/" + publishedA + "/registrations?limit=51")
      .set("Cookie", organizerCookie);
    const badCursor = await request(app).get("/api/v1/me/registrations?cursor=not-a-cursor").set("Cookie", participantCookie);
    expect(badLimit.status).toBe(400);
    expect(badLimit.body.error.code).toBe("INVALID_PAGINATION");
    expect(badRosterLimit.status).toBe(400);
    expect(badRosterLimit.body.error.code).toBe("INVALID_PAGINATION");
    expect(badCursor.status).toBe(400);
    expect(badCursor.body.error.code).toBe("INVALID_PAGINATION");

    const cursor = participantFirst.body.pagination.next_cursor as string;
    const otherPrincipal = await request(app)
      .get("/api/v1/me/registrations?cursor=" + encodeURIComponent(cursor))
      .set("Cookie", await login(emails.participantB));
    expect(otherPrincipal.status).toBe(200);
    expect(JSON.stringify(otherPrincipal.body)).not.toContain(emails.participantA);
    expect(otherPrincipal.body.data.map((row: { registration_id: string }) => row.registration_id))
      .toContain(laterRegistration);
  });
});
