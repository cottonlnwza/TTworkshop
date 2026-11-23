import { Router, type Request, type Response, type RequestHandler } from "express";
import type { Pool } from "pg";

type Identity = { id: string; email: string; role: "PARTICIPANT" | "ORGANIZER" };
const fail = (code: string, message: string) => ({ error: { code, message } });
const validId = (value: string): boolean => {
  if (!/^[1-9]\d{0,18}$/.test(value)) return false;
  return BigInt(value) <= 9223372036854775807n;
};

function parseDateTime(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|([+-])(\d{2}):(\d{2}))$/.exec(value);
  if (!match) return null;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, , , , offsetHourText, offsetMinuteText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const offsetHour = Number(offsetHourText ?? 0);
  const offsetMinute = Number(offsetMinuteText ?? 0);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ?? 0;
  if (year < 1 || day < 1 || day > daysInMonth || hour > 23 || minute > 59 || second > 59 ||
      offsetHour > 14 || offsetMinute > 59 || (offsetHour === 14 && offsetMinute !== 0)) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function invalidTextField(fields: {
  title?: unknown;
  description?: unknown;
  location?: unknown;
}): string | null {
  const labels = [
    ["title", "Title"],
    ["description", "Description"],
    ["location", "Location"]
  ] as const;
  for (const [field, label] of labels) {
    const value = fields[field];
    if (value !== undefined && value !== null && typeof value !== "string") {
      return `${label} must be a string`;
    }
  }
  return null;
}

export function createWorkshopRouter(
  pool: Pool,
  requireOrigin: RequestHandler,
  requireOrganizerWithIdentity: RequestHandler,
  now: () => Date = () => new Date()
) {
  const router = Router();
  // Browsers control the Origin header and commonly omit it on same-origin GETs.
  // Fetch Metadata safely identifies those requests without weakening write routes.
  const requireReadOrigin: RequestHandler = (req, res, next) => {
    if (req.headers.origin === undefined && req.headers["sec-fetch-site"] === "same-origin") {
      next();
      return;
    }
    requireOrigin(req, res, next);
  };

  // POST /api/v1/workshops - Create partial DRAFT
  router.post("/workshops", requireOrigin, requireOrganizerWithIdentity, async (req: Request, res: Response) => {
    const identity = (req as any).identity as Identity;
    const { title, description, location, starts_at, ends_at, capacity, registration_deadline } = req.body || {};

    // BR-08 Create validation
    const start = starts_at == null ? null : parseDateTime(starts_at);
    const end = ends_at == null ? null : parseDateTime(ends_at);
    const deadline = registration_deadline == null ? null : parseDateTime(registration_deadline);
    let cap: number | null = null;
    if (capacity !== undefined && capacity !== null) {
      if (typeof capacity !== "number" || !Number.isInteger(capacity) || capacity <= 0) {
        return res.status(400).json(fail("VALIDATION", "Capacity must be a positive integer"));
      }
      cap = capacity;
    }
    const textFieldError = invalidTextField({ title, description, location });
    if (textFieldError) return res.status(400).json(fail("VALIDATION", textFieldError));
    if ((starts_at != null && !start) || (ends_at != null && !end) ||
        (registration_deadline != null && !deadline)) {
      return res.status(400).json(fail("VALIDATION", "Date-times must be valid ISO 8601 values with an explicit offset"));
    }
    if (cap !== null && (!Number.isInteger(cap) || cap <= 0)) {
      return res.status(400).json(fail("VALIDATION", "Capacity must be a positive integer"));
    }
    if (start && deadline && deadline > start) {
      return res.status(400).json(fail("VALIDATION", "Registration deadline cannot be later than start time"));
    }
    if (start && end && end <= start) {
      return res.status(400).json(fail("VALIDATION", "End time must be after start time"));
    }

    try {
      const result = await pool.query(
        `INSERT INTO workshops (owner_user_id, title, description, location, starts_at, ends_at, capacity, registration_deadline, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'DRAFT')
         RETURNING id, owner_user_id, title, description, location, starts_at, ends_at, capacity, status, registration_deadline, registration_closed, created_at`,
        [identity.id, title || null, description || null, location || null, start, end, cap, deadline]
      );
      res.status(201).json({ data: result.rows[0] });
    } catch (err) {
      res.status(400).json(fail("VALIDATION", "Invalid workshop data"));
    }
  });

  // GET /api/v1/organizer/workshops - List own workshops
  router.get("/organizer/workshops", requireReadOrigin, requireOrganizerWithIdentity, async (req: Request, res: Response) => {
    const identity = (req as any).identity as Identity;
    const result = await pool.query(
      `SELECT id, owner_user_id, title, description, location, starts_at, ends_at, capacity, status, registration_deadline, registration_closed, created_at
       FROM workshops WHERE owner_user_id = $1 ORDER BY created_at DESC`,
      [identity.id]
    );
    res.status(200).json({ data: result.rows });
  });

  // GET /api/v1/organizer/workshops/:id - Get own workshop detail
  router.get("/organizer/workshops/:id", requireReadOrigin, requireOrganizerWithIdentity, async (req: Request, res: Response) => {
    const identity = (req as any).identity as Identity;
    const id = Array.isArray(req.params.id) ? req.params.id[0] ?? "" : req.params.id;
    if (!validId(id)) return res.status(404).json(fail("NOT_FOUND", "Workshop not found or access denied"));
    const result = await pool.query(
      `SELECT w.id, w.owner_user_id, w.title, w.description, w.location, w.starts_at, w.ends_at,
              w.capacity, w.status, w.registration_deadline, w.registration_closed, w.created_at,
              COALESCE((SELECT count(*)::int FROM registrations r WHERE r.workshop_id = w.id AND r.status = 'ACTIVE'), 0) AS active_registrations_count
       FROM workshops w WHERE w.id = $1 AND w.owner_user_id = $2`,
      [id, identity.id]
    );
    if (!result.rowCount) return res.status(404).json(fail("NOT_FOUND", "Workshop not found or access denied"));
    res.status(200).json({ data: result.rows[0] });
  });

  // PATCH /api/v1/organizer/workshops/:id - Update owned DRAFT (F-02) or PUBLISHED workshop (F-07 / DEC-07 / DEC-08)
  router.patch("/organizer/workshops/:id", requireOrigin, requireOrganizerWithIdentity, async (req: Request, res: Response) => {
    const identity = (req as any).identity as Identity;
    const id = Array.isArray(req.params.id) ? req.params.id[0] ?? "" : req.params.id;
    if (!validId(id)) return res.status(404).json(fail("NOT_FOUND", "Workshop not found or access denied"));
    if (req.body !== undefined && req.body !== null && (typeof req.body !== "object" || Array.isArray(req.body))) {
      return res.status(400).json(fail("VALIDATION", "Invalid request body"));
    }
    const body = (req.body && typeof req.body === "object" ? req.body : {}) as Record<string, unknown>;
    const hasProp = (key: string) => Object.prototype.hasOwnProperty.call(body, key);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const nowIso = now().toISOString();
      const current = await client.query<{
        id: string;
        owner_user_id: string;
        title: string | null;
        description: string | null;
        location: string | null;
        starts_at: Date | null;
        ends_at: Date | null;
        capacity: number | null;
        status: string;
        registration_deadline: Date | null;
        registration_closed: boolean;
        has_ended: boolean;
        has_started: boolean;
      }>(
        `SELECT id, owner_user_id, title, description, location, starts_at, ends_at,
                capacity, status, registration_deadline, registration_closed,
                (ends_at IS NOT NULL AND $3::timestamptz >= ends_at) AS has_ended,
                (starts_at IS NOT NULL AND $3::timestamptz >= starts_at) AS has_started
         FROM workshops WHERE id = $1 AND owner_user_id = $2 FOR UPDATE`,
        [id, identity.id, nowIso]
      );
      if (!current.rowCount) {
        await client.query("ROLLBACK");
        return res.status(404).json(fail("NOT_FOUND", "Workshop not found or access denied"));
      }
      const w = current.rows[0]!;

      // F-02 DRAFT update path (preserved unchanged under REV-S2-01)
      if (w.status === "DRAFT") {
        const { title, description, location, starts_at, ends_at, capacity, registration_deadline } = body;
        const hasRegistrationDeadline = hasProp("registration_deadline");

        const start = starts_at == null ? null : parseDateTime(starts_at);
        const end = ends_at == null ? null : parseDateTime(ends_at);
        const deadline = registration_deadline == null ? null : parseDateTime(registration_deadline);
        let cap: number | null = null;
        if (capacity !== undefined && capacity !== null) {
          if (typeof capacity !== "number" || !Number.isInteger(capacity) || capacity <= 0) {
            await client.query("ROLLBACK");
            return res.status(400).json(fail("VALIDATION", "Capacity must be a positive integer"));
          }
          cap = capacity;
        }
        const textFieldError = invalidTextField({ title, description, location });
        if (textFieldError) {
          await client.query("ROLLBACK");
          return res.status(400).json(fail("VALIDATION", textFieldError));
        }
        if ((starts_at != null && !start) || (ends_at != null && !end) ||
            (registration_deadline != null && !deadline)) {
          await client.query("ROLLBACK");
          return res.status(400).json(fail("VALIDATION", "Date-times must be valid ISO 8601 values with an explicit offset"));
        }
        if (cap !== null && (!Number.isInteger(cap) || cap <= 0)) {
          await client.query("ROLLBACK");
          return res.status(400).json(fail("VALIDATION", "Capacity must be a positive integer"));
        }
        const mergedStart = starts_at == null ? w.starts_at : start;
        const mergedDeadline = hasRegistrationDeadline ? deadline : w.registration_deadline;
        if (mergedStart && mergedDeadline && mergedDeadline > mergedStart) {
          await client.query("ROLLBACK");
          return res.status(400).json(fail("VALIDATION", "Registration deadline cannot be later than start time"));
        }
        const mergedEnd = ends_at == null ? w.ends_at : end;
        if (mergedStart && mergedEnd && mergedEnd <= mergedStart) {
          await client.query("ROLLBACK");
          return res.status(400).json(fail("VALIDATION", "End time must be after start time"));
        }

        const result = await client.query(
          `UPDATE workshops SET
            title = COALESCE($2, title),
            description = COALESCE($3, description),
            location = COALESCE($4, location),
            starts_at = COALESCE($5, starts_at),
            ends_at = COALESCE($6, ends_at),
            capacity = COALESCE($7, capacity),
            registration_deadline = CASE WHEN $9 THEN $8 ELSE registration_deadline END,
            updated_at = now()
           WHERE id = $1 AND owner_user_id = $10 AND status = 'DRAFT'
           RETURNING id, owner_user_id, title, description, location, starts_at, ends_at, capacity, status, registration_deadline, updated_at`,
          [id, title, description, location, start, end, cap, deadline, hasRegistrationDeadline, identity.id]
        );
        if (result.rowCount === 0) {
          await client.query("ROLLBACK");
          return res.status(409).json(fail("INVALID_STATE", "Workshop no longer in DRAFT status or not found"));
        }
        await client.query("COMMIT");
        return res.status(200).json({ data: result.rows[0] });
      }

      if (w.status !== "PUBLISHED") {
        await client.query("ROLLBACK");
        return res.status(409).json(fail("INVALID_STATE", "Workshop cannot be edited in its current state"));
      }

      // F-07 PUBLISHED update path (DEC-07 / DEC-08)
      const immutableFields = ["id", "owner_user_id", "status", "registration_closed", "created_at"] as const;
      for (const field of immutableFields) {
        if (hasProp(field)) {
          await client.query("ROLLBACK");
          return res.status(400).json(fail("VALIDATION", `Cannot modify immutable field: ${field}`));
        }
      }

      if (w.has_ended) {
        await client.query("ROLLBACK");
        return res.status(409).json(fail("WORKSHOP_ENDED", "Workshop has already ended"));
      }

      const hasTitle = hasProp("title");
      const hasDescription = hasProp("description");
      const hasLocation = hasProp("location");
      const hasStartsAt = hasProp("starts_at");
      const hasEndsAt = hasProp("ends_at");
      const hasCapacity = hasProp("capacity");
      const hasRegistrationDeadline = hasProp("registration_deadline");

      const parseRequiredText = (value: unknown): string | null => {
        if (typeof value !== "string" || value.trim().length === 0) return null;
        return value.trim();
      };

      let nextTitle = w.title;
      if (hasTitle) {
        const parsed = parseRequiredText(body.title);
        if (!parsed) {
          await client.query("ROLLBACK");
          return res.status(400).json(fail("VALIDATION", "Title must be a non-empty string"));
        }
        nextTitle = parsed;
      }

      let nextDescription = w.description;
      if (hasDescription) {
        const parsed = parseRequiredText(body.description);
        if (!parsed) {
          await client.query("ROLLBACK");
          return res.status(400).json(fail("VALIDATION", "Description must be a non-empty string"));
        }
        nextDescription = parsed;
      }

      let nextLocation = w.location;
      if (hasLocation) {
        const parsed = parseRequiredText(body.location);
        if (!parsed) {
          await client.query("ROLLBACK");
          return res.status(400).json(fail("VALIDATION", "Location must be a non-empty string"));
        }
        nextLocation = parsed;
      }

      let nextCapacity = w.capacity;
      if (hasCapacity) {
        const capVal = body.capacity;
        if (typeof capVal !== "number" || !Number.isInteger(capVal) || capVal < 1 || capVal > 2147483647) {
          await client.query("ROLLBACK");
          return res.status(400).json(fail("VALIDATION", "Capacity must be a positive 32-bit integer"));
        }
        nextCapacity = capVal;
      }

      let startsAtParam: string | null = null;
      if (hasStartsAt) {
        if (!parseDateTime(body.starts_at)) {
          await client.query("ROLLBACK");
          return res.status(400).json(fail("VALIDATION", "Date-times must be valid ISO 8601 values with an explicit offset"));
        }
        startsAtParam = body.starts_at as string;
      }

      let endsAtParam: string | null = null;
      if (hasEndsAt) {
        if (!parseDateTime(body.ends_at)) {
          await client.query("ROLLBACK");
          return res.status(400).json(fail("VALIDATION", "Date-times must be valid ISO 8601 values with an explicit offset"));
        }
        endsAtParam = body.ends_at as string;
      }

      let deadlineParam: string | null = null;
      if (hasRegistrationDeadline) {
        if (body.registration_deadline === null) {
          deadlineParam = null;
        } else {
          if (!parseDateTime(body.registration_deadline)) {
            await client.query("ROLLBACK");
            return res.status(400).json(fail("VALIDATION", "Date-times must be valid ISO 8601 values with an explicit offset"));
          }
          deadlineParam = body.registration_deadline as string;
        }
      }

      // Compare schedule timestamps and chronological invariants at full PostgreSQL TIMESTAMPTZ precision
      // so omitted columns and sub-millisecond microseconds are never truncated via JS Date.
      const checkRes = await client.query<{
        active_count: number;
        starts_changed: boolean;
        ends_changed: boolean;
        invalid_time_order: boolean;
        invalid_deadline_order: boolean;
      }>(
        `SELECT
          (SELECT count(*)::int FROM registrations WHERE workshop_id = w.id AND status = 'ACTIVE') AS active_count,
          (CASE WHEN $2 THEN $3::timestamptz IS DISTINCT FROM w.starts_at ELSE false END) AS starts_changed,
          (CASE WHEN $4 THEN $5::timestamptz IS DISTINCT FROM w.ends_at ELSE false END) AS ends_changed,
          (
            (CASE WHEN $2 THEN $3::timestamptz ELSE w.starts_at END) IS NULL OR
            (CASE WHEN $4 THEN $5::timestamptz ELSE w.ends_at END) IS NULL OR
            (CASE WHEN $4 THEN $5::timestamptz ELSE w.ends_at END) <= (CASE WHEN $2 THEN $3::timestamptz ELSE w.starts_at END)
          ) AS invalid_time_order,
          (
            (CASE WHEN $6 THEN $7::timestamptz ELSE w.registration_deadline END) IS NOT NULL AND
            (CASE WHEN $2 THEN $3::timestamptz ELSE w.starts_at END) IS NOT NULL AND
            (CASE WHEN $6 THEN $7::timestamptz ELSE w.registration_deadline END) > (CASE WHEN $2 THEN $3::timestamptz ELSE w.starts_at END)
          ) AS invalid_deadline_order
         FROM workshops w WHERE w.id = $1`,
        [id, hasStartsAt, startsAtParam, hasEndsAt, endsAtParam, hasRegistrationDeadline, deadlineParam]
      );
      const check = checkRes.rows[0]!;
      const activeCount = Number(check.active_count ?? 0);

      if ((check.starts_changed || check.ends_changed) && (activeCount > 0 || w.has_started)) {
        await client.query("ROLLBACK");
        return res.status(409).json(fail("SCHEDULE_LOCKED", "Workshop schedule cannot be changed after registrations exist or after start time"));
      }
      if (check.invalid_time_order) {
        await client.query("ROLLBACK");
        return res.status(400).json(fail("VALIDATION", "End time must be after start time"));
      }
      if (check.invalid_deadline_order) {
        await client.query("ROLLBACK");
        return res.status(400).json(fail("VALIDATION", "Registration deadline cannot be later than start time"));
      }
      if (nextCapacity == null || nextCapacity < activeCount) {
        await client.query("ROLLBACK");
        return res.status(409).json(fail("CAPACITY_BELOW_ACTIVE", "Capacity cannot be reduced below current active registrations"));
      }

      const updated = await client.query(
        `UPDATE workshops SET
          title = $3,
          description = $4,
          location = $5,
          starts_at = CASE WHEN $6 THEN $7::timestamptz ELSE starts_at END,
          ends_at = CASE WHEN $8 THEN $9::timestamptz ELSE ends_at END,
          capacity = $10,
          registration_deadline = CASE WHEN $11 THEN $12::timestamptz ELSE registration_deadline END,
          updated_at = now()
         WHERE id = $1 AND owner_user_id = $2 AND status = 'PUBLISHED'
         RETURNING id, owner_user_id, title, description, location, starts_at, ends_at, capacity, status, registration_deadline, registration_closed, created_at, updated_at`,
        [
          id, identity.id, nextTitle, nextDescription, nextLocation,
          hasStartsAt, startsAtParam,
          hasEndsAt, endsAtParam,
          nextCapacity,
          hasRegistrationDeadline, deadlineParam
        ]
      );
      await client.query("COMMIT");
      return res.status(200).json({ data: { ...updated.rows[0], active_registrations_count: activeCount } });
    } catch {
      await client.query("ROLLBACK").catch(() => undefined);
      return res.status(400).json(fail("VALIDATION", "Invalid workshop data"));
    } finally {
      client.release();
    }
  });

  // POST /api/v1/organizer/workshops/:id/publish - Publish DRAFT
  router.post("/organizer/workshops/:id/publish", requireOrigin, requireOrganizerWithIdentity, async (req: Request, res: Response) => {
    const identity = (req as any).identity as Identity;
    const { id } = req.params;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const current = await client.query(
        `SELECT id, owner_user_id, title, description, location, starts_at, ends_at, capacity, status, registration_deadline
         FROM workshops WHERE id = $1 AND owner_user_id = $2 FOR UPDATE`,
        [id, identity.id]
      );
      if (!current.rowCount) {
        await client.query("ROLLBACK");
        return res.status(404).json(fail("NOT_FOUND", "Workshop not found or access denied"));
      }
      const w = current.rows[0];
      if (w.status === "PUBLISHED") {
        await client.query("ROLLBACK");
        return res.status(409).json(fail("INVALID_STATE", "Workshop is already published"));
      }

      // Publish validation (BR-02, BR-03, BR-08)
      if (!w.title?.trim() || !w.description?.trim() || !w.location?.trim() || !w.starts_at || !w.ends_at || w.capacity == null) {
        await client.query("ROLLBACK");
        return res.status(400).json(fail("VALIDATION", "Missing required fields for publication"));
      }
      if (w.ends_at <= w.starts_at) {
        await client.query("ROLLBACK");
        return res.status(400).json(fail("VALIDATION", "End time must be after start time"));
      }
      if (w.capacity <= 0 || !Number.isInteger(w.capacity)) {
        await client.query("ROLLBACK");
        return res.status(400).json(fail("VALIDATION", "Capacity must be a positive integer"));
      }
      if (w.registration_deadline && w.registration_deadline > w.starts_at) {
        await client.query("ROLLBACK");
        return res.status(400).json(fail("VALIDATION", "Registration deadline cannot be later than start time"));
      }

      const result = await client.query(
        `UPDATE workshops SET status = 'PUBLISHED', updated_at = now()
         WHERE id = $1 AND owner_user_id = $2 AND status = 'DRAFT'
         RETURNING id, owner_user_id, title, description, location, starts_at, ends_at, capacity, status, registration_deadline, registration_closed, updated_at`,
        [id, identity.id]
      );
      if (!result.rowCount) {
        await client.query("ROLLBACK");
        return res.status(409).json(fail("CONFLICT", "Workshop was already published or modified"));
      }
      await client.query("COMMIT");
      return res.status(200).json({ data: result.rows[0] });
    } catch (err) {
      await client.query("ROLLBACK").catch(() => undefined);
      return res.status(500).json(fail("INTERNAL", "Failed to publish workshop"));
    } finally {
      client.release();
    }
  });

  // POST /api/v1/organizer/workshops/:id/close-registration - Manual closure (F-06 / BR-10)
  router.post("/organizer/workshops/:id/close-registration", requireOrigin, requireOrganizerWithIdentity, async (req: Request, res: Response) => {
    const identity = (req as any).identity as Identity;
    const id = Array.isArray(req.params.id) ? req.params.id[0] ?? "" : req.params.id;
    if (!validId(id)) return res.status(404).json(fail("NOT_FOUND", "Workshop not found or access denied"));

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const current = await client.query<{ status: string; registration_closed: boolean }>(
        "SELECT status, registration_closed FROM workshops WHERE id = $1 AND owner_user_id = $2 FOR UPDATE",
        [id, identity.id]
      );
      if (!current.rowCount) {
        await client.query("ROLLBACK");
        return res.status(404).json(fail("NOT_FOUND", "Workshop not found or access denied"));
      }
      const w = current.rows[0]!;
      if (w.status !== "PUBLISHED") {
        await client.query("ROLLBACK");
        return res.status(409).json(fail("INVALID_STATE", "Only published workshops can close registration"));
      }
      if (w.registration_closed) {
        await client.query("ROLLBACK");
        return res.status(409).json(fail("INVALID_STATE", "Registration is already closed"));
      }
      const updated = await client.query(
        `UPDATE workshops SET registration_closed = true, updated_at = now()
         WHERE id = $1 AND owner_user_id = $2 AND status = 'PUBLISHED'
         RETURNING id, owner_user_id, title, description, location, starts_at, ends_at, capacity, status, registration_deadline, registration_closed, updated_at`,
        [id, identity.id]
      );
      await client.query("COMMIT");
      return res.status(200).json({ data: updated.rows[0] });
    } catch {
      await client.query("ROLLBACK").catch(() => undefined);
      return res.status(500).json(fail("INTERNAL", "Failed to close registration"));
    } finally {
      client.release();
    }
  });

  // POST /api/v1/organizer/workshops/:id/reopen-registration - Manual reopen (F-06 / BR-11)
  router.post("/organizer/workshops/:id/reopen-registration", requireOrigin, requireOrganizerWithIdentity, async (req: Request, res: Response) => {
    const identity = (req as any).identity as Identity;
    const id = Array.isArray(req.params.id) ? req.params.id[0] ?? "" : req.params.id;
    if (!validId(id)) return res.status(404).json(fail("NOT_FOUND", "Workshop not found or access denied"));

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const current = await client.query<{
        status: string; starts_at: Date | null; registration_deadline: Date | null; registration_closed: boolean;
      }>(
        "SELECT status, starts_at, registration_deadline, registration_closed FROM workshops WHERE id = $1 AND owner_user_id = $2 FOR UPDATE",
        [id, identity.id]
      );
      if (!current.rowCount) {
        await client.query("ROLLBACK");
        return res.status(404).json(fail("NOT_FOUND", "Workshop not found or access denied"));
      }
      const w = current.rows[0]!;
      if (w.status !== "PUBLISHED") {
        await client.query("ROLLBACK");
        return res.status(409).json(fail("INVALID_STATE", "Only published workshops can reopen registration"));
      }
      if (!w.registration_closed) {
        await client.query("ROLLBACK");
        return res.status(409).json(fail("INVALID_STATE", "Registration is already open"));
      }
      if (!w.starts_at || (w.registration_deadline && w.registration_deadline > w.starts_at)) {
        await client.query("ROLLBACK");
        return res.status(409).json(fail("INVALID_DEADLINE", "Workshop registration deadline is invalid"));
      }
      const effectiveDeadline = w.registration_deadline ?? w.starts_at;
      if (now().getTime() >= effectiveDeadline.getTime()) {
        await client.query("ROLLBACK");
        return res.status(409).json(fail("DEADLINE_PASSED", "Registration deadline has passed"));
      }
      const updated = await client.query(
        `UPDATE workshops SET registration_closed = false, updated_at = now()
         WHERE id = $1 AND owner_user_id = $2 AND status = 'PUBLISHED'
         RETURNING id, owner_user_id, title, description, location, starts_at, ends_at, capacity, status, registration_deadline, registration_closed, updated_at`,
        [id, identity.id]
      );
      await client.query("COMMIT");
      return res.status(200).json({ data: updated.rows[0] });
    } catch {
      await client.query("ROLLBACK").catch(() => undefined);
      return res.status(500).json(fail("INTERNAL", "Failed to reopen registration"));
    } finally {
      client.release();
    }
  });

  // PATCH /api/v1/organizer/workshops/:id/registration-deadline - Published deadline update (F-06 / BR-08)
  router.patch("/organizer/workshops/:id/registration-deadline", requireOrigin, requireOrganizerWithIdentity, async (req: Request, res: Response) => {
    const identity = (req as any).identity as Identity;
    const id = Array.isArray(req.params.id) ? req.params.id[0] ?? "" : req.params.id;
    if (!validId(id)) return res.status(404).json(fail("NOT_FOUND", "Workshop not found or access denied"));

    const body = req.body && typeof req.body === "object" ? req.body as Record<string, unknown> : {};
    if (!Object.prototype.hasOwnProperty.call(body, "registration_deadline")) {
      return res.status(400).json(fail("VALIDATION", "registration_deadline is required"));
    }
    const rawDeadline = body.registration_deadline;
    const deadline = rawDeadline === null ? null : parseDateTime(rawDeadline);
    if (rawDeadline !== null && !deadline) {
      return res.status(400).json(fail("VALIDATION", "Date-times must be valid ISO 8601 values with an explicit offset"));
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const current = await client.query<{
        status: string; starts_at: Date | null; ends_at: Date | null;
      }>(
        "SELECT status, starts_at, ends_at FROM workshops WHERE id = $1 AND owner_user_id = $2 FOR UPDATE",
        [id, identity.id]
      );
      if (!current.rowCount) {
        await client.query("ROLLBACK");
        return res.status(404).json(fail("NOT_FOUND", "Workshop not found or access denied"));
      }
      const w = current.rows[0]!;
      if (w.status !== "PUBLISHED") {
        await client.query("ROLLBACK");
        return res.status(409).json(fail("INVALID_STATE", "Only published workshops can update registration deadline here"));
      }
      if (w.ends_at && now().getTime() >= w.ends_at.getTime()) {
        await client.query("ROLLBACK");
        return res.status(409).json(fail("WORKSHOP_ENDED", "Workshop has already ended"));
      }
      if (deadline && w.starts_at && deadline > w.starts_at) {
        await client.query("ROLLBACK");
        return res.status(400).json(fail("VALIDATION", "Registration deadline cannot be later than start time"));
      }
      const updated = await client.query(
        `UPDATE workshops SET registration_deadline = $3, updated_at = now()
         WHERE id = $1 AND owner_user_id = $2 AND status = 'PUBLISHED'
         RETURNING id, owner_user_id, title, description, location, starts_at, ends_at, capacity, status, registration_deadline, registration_closed, updated_at`,
        [id, identity.id, deadline]
      );
      await client.query("COMMIT");
      return res.status(200).json({ data: updated.rows[0] });
    } catch {
      await client.query("ROLLBACK").catch(() => undefined);
      return res.status(500).json(fail("INTERNAL", "Failed to update registration deadline"));
    } finally {
      client.release();
    }
  });

  return router;
}
