import { Router, type Request, type Response, type RequestHandler } from "express";
import type { Pool } from "pg";
import { encodeRegistrationCursor, parseRegistrationPagination } from "./registrationPagination.js";

const fail = (code: string, message: string) => ({ error: { code, message } });
const validId = (value: string): boolean => {
  if (!/^[1-9]\d{0,18}$/.test(value)) return false;
  return BigInt(value) <= 9223372036854775807n;
};

export function createRegistrationRouter(
  pool: Pool,
  requireParticipant: RequestHandler,
  requireOrigin: RequestHandler,
  requireOrganizer: RequestHandler,
  now: () => Date = () => new Date()
) {
  const router = Router();
  const noStore: RequestHandler = (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  };

  router.get("/me/registrations", noStore, requireParticipant, async (req: Request, res: Response) => {
    const pagination = parseRegistrationPagination(req.query);
    if (!pagination) return res.status(400).json(fail("INVALID_PAGINATION", "Invalid pagination parameters"));
    const identity = (req as Request & { identity?: { id: string } }).identity;
    if (!identity) return res.status(500).json(fail("INTERNAL", "Internal error"));
    const result = await pool.query<{
      id: string; workshop_id: string; title: string; starts_at: Date;
      status: string; registered_at: string; cancelled_at: string | null; checked_in_at: string | null;
    }>(
      "SELECT r.id::text AS id,r.workshop_id::text AS workshop_id,w.title,w.starts_at," +
      "r.status,to_char(r.registered_at AT TIME ZONE 'UTC'," +
      "'YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"') AS registered_at," +
      "CASE WHEN r.cancelled_at IS NULL THEN NULL ELSE " +
      "to_char(r.cancelled_at AT TIME ZONE 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"') END AS cancelled_at," +
      "CASE WHEN r.checked_in_at IS NULL THEN NULL ELSE " +
      "to_char(r.checked_in_at AT TIME ZONE 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"') END AS checked_in_at " +
      "FROM registrations r JOIN workshops w ON w.id=r.workshop_id " +
      "WHERE r.participant_user_id=$1 " +
      "AND ($2::timestamptz IS NULL OR (r.registered_at,r.id)<($2::timestamptz,$3::bigint)) " +
      "ORDER BY r.registered_at DESC,r.id DESC LIMIT $4",
      [identity.id, pagination.cursor?.registeredAt ?? null, pagination.cursor?.id ?? null, pagination.limit + 1]
    );
    const hasMore = result.rows.length > pagination.limit;
    const rows = result.rows.slice(0, pagination.limit);
    const data = rows.map(row => ({
      registration_id: row.id,
      workshop: { workshop_id: row.workshop_id, title: row.title, starts_at: row.starts_at },
      status: row.status,
      registered_at: row.registered_at,
      cancelled_at: row.cancelled_at,
      checked_in_at: row.checked_in_at
    }));
    const last = rows.at(-1);
    res.status(200).json({
      data,
      pagination: { next_cursor: hasMore && last ? encodeRegistrationCursor(last) : null }
    });
  });

  router.get("/me/registrations/:id", noStore, requireParticipant, async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] ?? "" : req.params.id;
    if (!validId(id)) return res.status(404).json(fail("NOT_FOUND", "Registration not found"));
    const identity = (req as Request & { identity?: { id: string } }).identity;
    if (!identity) return res.status(500).json(fail("INTERNAL", "Internal error"));
    const result = await pool.query<{
      id: string; workshop_id: string; title: string; starts_at: Date;
      status: string; registered_at: string; cancelled_at: string | null; checked_in_at: string | null;
    }>(
      "SELECT r.id::text AS id,r.workshop_id::text AS workshop_id,w.title,w.starts_at," +
      "r.status,to_char(r.registered_at AT TIME ZONE 'UTC'," +
      "'YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"') AS registered_at," +
      "CASE WHEN r.cancelled_at IS NULL THEN NULL ELSE " +
      "to_char(r.cancelled_at AT TIME ZONE 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"') END AS cancelled_at," +
      "CASE WHEN r.checked_in_at IS NULL THEN NULL ELSE " +
      "to_char(r.checked_in_at AT TIME ZONE 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"') END AS checked_in_at " +
      "FROM registrations r JOIN workshops w ON w.id=r.workshop_id " +
      "WHERE r.id=$1 AND r.participant_user_id=$2",
      [id, identity.id]
    );
    const row = result.rows[0];
    if (!row) return res.status(404).json(fail("NOT_FOUND", "Registration not found"));
    res.status(200).json({
      data: {
        registration_id: row.id,
        workshop: { workshop_id: row.workshop_id, title: row.title, starts_at: row.starts_at },
        status: row.status,
        registered_at: row.registered_at,
        cancelled_at: row.cancelled_at,
        checked_in_at: row.checked_in_at
      }
    });
  });

  router.post("/me/registrations/:id/cancel", noStore, requireParticipant, requireOrigin,
    async (req: Request, res: Response, next) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] ?? "" : req.params.id;
      if (!validId(id)) return res.status(404).json(fail("NOT_FOUND", "Registration not found"));
      const identity = (req as Request & { identity?: { id: string } }).identity;
      if (!identity) return res.status(500).json(fail("INTERNAL", "Internal error"));

      const client = await pool.connect();
      let inTransaction = false;
      try {
        await client.query("BEGIN");
        inTransaction = true;
        const owned = await client.query<{ id: string; workshop_id: string }>(
          "SELECT id::text AS id, workshop_id::text AS workshop_id " +
          "FROM registrations WHERE id=$1 AND participant_user_id=$2",
          [id, identity.id]
        );
        if (!owned.rowCount) {
          await client.query("ROLLBACK");
          inTransaction = false;
          return res.status(404).json(fail("NOT_FOUND", "Registration not found"));
        }
        const workshopId = owned.rows[0]!.workshop_id;

        // Acquire the workshop lock before locking the registration row to match
        // POST /workshops/:id/registrations lock ordering and prevent deadlocks.
        const workshop = await client.query<{
          id: string; starts_at: Date | null; registration_deadline: Date | null;
        }>(
          "SELECT id::text AS id, starts_at, registration_deadline FROM workshops WHERE id=$1 FOR UPDATE",
          [workshopId]
        );
        if (!workshop.rowCount) {
          await client.query("ROLLBACK");
          inTransaction = false;
          return res.status(404).json(fail("NOT_FOUND", "Registration not found"));
        }

        const reg = await client.query<{
          id: string; status: string; checked_in_at: Date | null;
        }>(
          "SELECT id::text AS id, status, checked_in_at " +
          "FROM registrations WHERE id=$1 AND participant_user_id=$2 FOR UPDATE",
          [id, identity.id]
        );
        const regRow = reg.rows[0];
        if (!regRow) {
          await client.query("ROLLBACK");
          inTransaction = false;
          return res.status(404).json(fail("NOT_FOUND", "Registration not found"));
        }
        if (regRow.status === "CANCELLED") {
          await client.query("ROLLBACK");
          inTransaction = false;
          return res.status(409).json(fail("ALREADY_CANCELLED", "Registration is already cancelled"));
        }
        if (regRow.checked_in_at !== null) {
          await client.query("ROLLBACK");
          inTransaction = false;
          return res.status(409).json(fail("ALREADY_CHECKED_IN", "Cannot cancel a checked-in registration"));
        }

        const workshopRow = workshop.rows[0]!;
        if (!workshopRow.starts_at ||
            (workshopRow.registration_deadline && workshopRow.registration_deadline > workshopRow.starts_at)) {
          await client.query("ROLLBACK");
          inTransaction = false;
          return res.status(409).json(fail("INVALID_DEADLINE", "Workshop registration deadline is invalid"));
        }
        const currentTime = now();
        const effectiveDeadline = workshopRow.registration_deadline ?? workshopRow.starts_at;
        if (currentTime.getTime() >= effectiveDeadline.getTime()) {
          await client.query("ROLLBACK");
          inTransaction = false;
          return res.status(409).json(fail("CANCELLATION_DEADLINE_PASSED", "Cancellation deadline has passed"));
        }

        const updated = await client.query<{
          id: string; workshop_id: string; status: string; registered_at: string; cancelled_at: string;
        }>(
          "UPDATE registrations SET status='CANCELLED', cancelled_at=$2 " +
          "WHERE id=$1 AND participant_user_id=$3 AND status='ACTIVE' " +
          "RETURNING id::text AS id, workshop_id::text AS workshop_id, status," +
          "to_char(registered_at AT TIME ZONE 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"') AS registered_at," +
          "to_char(cancelled_at AT TIME ZONE 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"') AS cancelled_at",
          [id, currentTime, identity.id]
        );
        if (!updated.rowCount) {
          await client.query("ROLLBACK");
          inTransaction = false;
          return res.status(409).json(fail("ALREADY_CANCELLED", "Registration is already cancelled"));
        }
        await client.query("COMMIT");
        inTransaction = false;
        const row = updated.rows[0]!;
        return res.status(200).json({
          data: {
            registration_id: row.id,
            workshop_id: row.workshop_id,
            status: row.status,
            registered_at: row.registered_at,
            cancelled_at: row.cancelled_at
          }
        });
      } catch (error) {
        if (inTransaction) await client.query("ROLLBACK").catch(() => undefined);
        return next(error);
      } finally {
        client.release();
      }
    });

  router.get("/organizer/workshops/:id/registrations", noStore, requireOrganizer,
    async (req: Request, res: Response) => {
      const workshopId = Array.isArray(req.params.id) ? req.params.id[0] ?? "" : req.params.id;
      if (!validId(workshopId)) return res.status(404).json(fail("NOT_FOUND", "Workshop not found"));
      const identity = (req as Request & { identity?: { id: string } }).identity;
      if (!identity) return res.status(500).json(fail("INTERNAL", "Internal error"));
      const workshop = await pool.query(
        "SELECT id FROM workshops WHERE id=$1 AND owner_user_id=$2 AND status='PUBLISHED'",
        [workshopId, identity.id]
      );
      if (!workshop.rowCount) return res.status(404).json(fail("NOT_FOUND", "Workshop not found"));
      const pagination = parseRegistrationPagination(req.query);
      if (!pagination) return res.status(400).json(fail("INVALID_PAGINATION", "Invalid pagination parameters"));
      const result = await pool.query<{
        id: string; participant_user_id: string; status: string;
        registered_at: string; cancelled_at: string | null; checked_in_at: string | null;
      }>(
        "SELECT r.id::text AS id,r.participant_user_id::text AS participant_user_id,r.status," +
        "to_char(r.registered_at AT TIME ZONE 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"') AS registered_at," +
        "CASE WHEN r.cancelled_at IS NULL THEN NULL ELSE " +
        "to_char(r.cancelled_at AT TIME ZONE 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"') END AS cancelled_at," +
        "CASE WHEN r.checked_in_at IS NULL THEN NULL ELSE " +
        "to_char(r.checked_in_at AT TIME ZONE 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"') END AS checked_in_at " +
        "FROM registrations r WHERE r.workshop_id=$1 " +
        "AND ($2::timestamptz IS NULL OR (r.registered_at,r.id)<($2::timestamptz,$3::bigint)) " +
        "ORDER BY r.registered_at DESC,r.id DESC LIMIT $4",
        [workshopId, pagination.cursor?.registeredAt ?? null, pagination.cursor?.id ?? null, pagination.limit + 1]
      );
      const hasMore = result.rows.length > pagination.limit;
      const rows = result.rows.slice(0, pagination.limit);
      const data = rows.map(row => ({
        registration_id: row.id,
        participant_id: row.participant_user_id,
        status: row.status,
        registered_at: row.registered_at,
        cancelled_at: row.cancelled_at,
        checked_in_at: row.checked_in_at
      }));
      const last = rows.at(-1);
      res.status(200).json({
        data,
        pagination: { next_cursor: hasMore && last ? encodeRegistrationCursor(last) : null }
      });
    });

  // POST /api/v1/organizer/workshops/:workshopId/registrations/:registrationId/check-in (F-08 / BR-14 / DEC-09)
  router.post("/organizer/workshops/:workshopId/registrations/:registrationId/check-in",
    noStore, requireOrganizer, requireOrigin, async (req: Request, res: Response, next) => {
      const workshopId = Array.isArray(req.params.workshopId) ? req.params.workshopId[0] ?? "" : req.params.workshopId;
      const registrationId = Array.isArray(req.params.registrationId) ? req.params.registrationId[0] ?? "" : req.params.registrationId;
      if (!validId(workshopId) || !validId(registrationId)) {
        return res.status(404).json(fail("NOT_FOUND", "Workshop or registration not found"));
      }
      const identity = (req as Request & { identity?: { id: string } }).identity;
      if (!identity) return res.status(500).json(fail("INTERNAL", "Internal error"));

      const client = await pool.connect();
      let inTransaction = false;
      try {
        await client.query("BEGIN");
        inTransaction = true;

        // Acquire workshops FOR UPDATE before registrations FOR UPDATE (matches F-03/F-05/F-07 lock order).
        const ws = await client.query<{ id: string; status: string }>(
          "SELECT id::text AS id, status FROM workshops WHERE id=$1 AND owner_user_id=$2 FOR UPDATE",
          [workshopId, identity.id]
        );
        if (!ws.rowCount) {
          await client.query("ROLLBACK");
          inTransaction = false;
          return res.status(404).json(fail("NOT_FOUND", "Workshop not found"));
        }
        if (ws.rows[0]!.status !== "PUBLISHED") {
          await client.query("ROLLBACK");
          inTransaction = false;
          return res.status(409).json(fail("INVALID_STATE", "Only published workshops support check-in"));
        }

        const reg = await client.query<{ id: string; status: string; checked_in_at: Date | null }>(
          "SELECT id::text AS id, status, checked_in_at " +
          "FROM registrations WHERE id=$1 AND workshop_id=$2 FOR UPDATE",
          [registrationId, workshopId]
        );
        if (!reg.rowCount) {
          await client.query("ROLLBACK");
          inTransaction = false;
          return res.status(404).json(fail("NOT_FOUND", "Registration not found"));
        }
        const regRow = reg.rows[0]!;
        if (regRow.status !== "ACTIVE") {
          await client.query("ROLLBACK");
          inTransaction = false;
          return res.status(409).json(fail("INVALID_STATE", "Only ACTIVE registrations can be checked in"));
        }
        if (regRow.checked_in_at !== null) {
          await client.query("ROLLBACK");
          inTransaction = false;
          return res.status(409).json(fail("ALREADY_CHECKED_IN", "Registration is already checked in"));
        }

        // Sample time AFTER acquiring both FOR UPDATE locks and evaluate inclusive [starts_at, ends_at]
        // directly in PostgreSQL TIMESTAMPTZ precision (DEC-09 §1.2).
        const lockedNowIso = now().toISOString();
        const win = await client.query<{ invalid_window: boolean; before_start: boolean; after_end: boolean }>(
          "SELECT (starts_at IS NULL OR ends_at IS NULL) AS invalid_window, " +
          "($2::timestamptz < starts_at) AS before_start, " +
          "($2::timestamptz > ends_at) AS after_end " +
          "FROM workshops WHERE id=$1",
          [workshopId, lockedNowIso]
        );
        const wCheck = win.rows[0]!;
        if (wCheck.invalid_window) {
          await client.query("ROLLBACK");
          inTransaction = false;
          return res.status(409).json(fail("INVALID_STATE", "Workshop schedule is invalid for check-in"));
        }
        if (wCheck.before_start) {
          await client.query("ROLLBACK");
          inTransaction = false;
          return res.status(409).json(fail("CHECKIN_WINDOW_CLOSED", "Check-in has not opened yet"));
        }
        if (wCheck.after_end) {
          await client.query("ROLLBACK");
          inTransaction = false;
          return res.status(409).json(fail("CHECKIN_WINDOW_CLOSED", "Check-in window has closed"));
        }

        const updated = await client.query<{
          registration_id: string; participant_id: string; status: string;
          registered_at: string; cancelled_at: string | null; checked_in_at: string;
        }>(
          "UPDATE registrations SET checked_in_at=$3::timestamptz " +
          "WHERE id=$1 AND workshop_id=$2 AND status='ACTIVE' AND checked_in_at IS NULL " +
          "RETURNING id::text AS registration_id, participant_user_id::text AS participant_id, status," +
          "to_char(registered_at AT TIME ZONE 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"') AS registered_at," +
          "CASE WHEN cancelled_at IS NULL THEN NULL ELSE " +
          "to_char(cancelled_at AT TIME ZONE 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"') END AS cancelled_at," +
          "to_char(checked_in_at AT TIME ZONE 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"') AS checked_in_at",
          [registrationId, workshopId, lockedNowIso]
        );
        if (!updated.rowCount) {
          await client.query("ROLLBACK");
          inTransaction = false;
          return res.status(409).json(fail("ALREADY_CHECKED_IN", "Registration is already checked in"));
        }
        await client.query("COMMIT");
        inTransaction = false;
        return res.status(200).json({ data: updated.rows[0] });
      } catch (error) {
        if (inTransaction) await client.query("ROLLBACK").catch(() => undefined);
        return next(error);
      } finally {
        client.release();
      }
    });

  // Participant-only published discovery. The caller's role is derived from
  // the authenticated server-side session by requireParticipant.
  router.get("/workshops", requireParticipant, async (_req: Request, res: Response) => {
    const result = await pool.query(
      `SELECT w.id,w.title,w.location,w.starts_at,w.capacity,w.registration_deadline,w.registration_closed,
              GREATEST(w.capacity-COUNT(r.id)::int,0)::int AS remaining_seats,
              CASE WHEN (w.registration_closed OR w.starts_at IS NULL OR w.registration_deadline>w.starts_at) THEN false
                   ELSE COUNT(r.id)<w.capacity AND $1::timestamptz<COALESCE(w.registration_deadline,w.starts_at) END AS registration_open
       FROM workshops w
       LEFT JOIN registrations r ON r.workshop_id=w.id AND r.status='ACTIVE'
       WHERE w.status='PUBLISHED'
       GROUP BY w.id
       ORDER BY w.starts_at ASC,w.id ASC`,
      [now()]
    );
    res.status(200).json({ data: result.rows });
  });

  router.get("/workshops/:id", requireParticipant, async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] ?? "" : req.params.id;
    if (!validId(id)) return res.status(404).json(fail("NOT_FOUND", "Workshop not found"));
    const result = await pool.query(
      `SELECT w.id,w.title,w.description,w.location,w.starts_at,w.ends_at,w.capacity,
              w.registration_deadline,w.registration_closed,w.status,
              GREATEST(w.capacity-COUNT(r.id)::int,0)::int AS remaining_seats,
              CASE WHEN (w.registration_closed OR w.starts_at IS NULL OR w.registration_deadline>w.starts_at) THEN false
                   ELSE COUNT(r.id)<w.capacity AND $2::timestamptz<COALESCE(w.registration_deadline,w.starts_at) END AS registration_open
       FROM workshops w
       LEFT JOIN registrations r ON r.workshop_id=w.id AND r.status='ACTIVE'
       WHERE w.id=$1 AND w.status='PUBLISHED'
       GROUP BY w.id`, [id, now()]
    );
    if (!result.rowCount) return res.status(404).json(fail("NOT_FOUND", "Workshop not found"));
    res.status(200).json({ data: result.rows[0] });
  });

  router.post("/workshops/:id/registrations", requireParticipant, requireOrigin,
    async (req: Request, res: Response, next) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] ?? "" : req.params.id;
      if (!validId(id)) return res.status(404).json(fail("NOT_FOUND", "Workshop not found"));

      const identity = (req as Request & { identity?: { id: string } }).identity;
      // requireParticipant attaches identity from the cookie-bound server
      // session. Never accept a Participant ID from the request body.
      if (!identity) return res.status(500).json(fail("INTERNAL", "Unable to resolve Participant identity"));

      const client = await pool.connect();
      let inTransaction = false;
      try {
        await client.query("BEGIN");
        inTransaction = true;
        const workshop = await client.query<{
          id: string; status: string; starts_at: Date | null;
          registration_deadline: Date | null; registration_closed: boolean; capacity: number;
        }>(
          `SELECT id,status,starts_at,registration_deadline,registration_closed,capacity
           FROM workshops WHERE id=$1 AND status='PUBLISHED' FOR UPDATE`, [id]
        );
        if (!workshop.rowCount) {
          await client.query("ROLLBACK");
          inTransaction = false;
          return res.status(404).json(fail("NOT_FOUND", "Workshop not found"));
        }
        const row = workshop.rows[0]!;
        if (row.registration_closed) {
          await client.query("ROLLBACK");
          inTransaction = false;
          return res.status(409).json(fail("REGISTRATION_CLOSED", "Workshop registration is closed"));
        }
        if (!row.starts_at || (row.registration_deadline && row.registration_deadline > row.starts_at)) {
          await client.query("ROLLBACK");
          inTransaction = false;
          return res.status(409).json(fail("INVALID_DEADLINE", "Workshop registration deadline is invalid"));
        }
        const effectiveDeadline = row.registration_deadline ?? row.starts_at;
        if (now().getTime() >= effectiveDeadline.getTime()) {
          await client.query("ROLLBACK");
          inTransaction = false;
          return res.status(409).json(fail("DEADLINE_PASSED", "Registration deadline has passed"));
        }
        const active = await client.query<{ count: number }>(
          "SELECT count(*)::int AS count FROM registrations WHERE workshop_id=$1 AND status='ACTIVE'", [id]
        );
        if (active.rows[0]!.count >= row.capacity) {
          await client.query("ROLLBACK");
          inTransaction = false;
          return res.status(409).json(fail("CAPACITY_FULL", "Workshop capacity is full"));
        }
        const inserted = await client.query(
          `INSERT INTO registrations(workshop_id,participant_user_id,status)
           VALUES($1,$2,'ACTIVE') RETURNING id,workshop_id,status,registered_at`,
          [id, identity.id]
        );
        await client.query("COMMIT");
        inTransaction = false;
        return res.status(201).json({ data: inserted.rows[0] });
      } catch (error) {
        if (inTransaction) await client.query("ROLLBACK");
        if (error && typeof error === "object" && "code" in error && error.code === "23505") {
          return res.status(409).json(fail("DUPLICATE_ACTIVE", "An active registration already exists"));
        }
        return next(error);
      } finally {
        client.release();
      }
    });

  return router;
}
