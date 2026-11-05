import { Router, type Request, type Response, type RequestHandler } from "express";
import type { Pool } from "pg";

type Identity = { id: string; email: string; role: "PARTICIPANT" | "ORGANIZER" };
const fail = (code: string, message: string) => ({ error: { code, message } });

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
  requireOrganizerWithIdentity: RequestHandler
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
         RETURNING id, owner_user_id, title, description, location, starts_at, ends_at, capacity, status, registration_deadline, created_at`,
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
      `SELECT id, owner_user_id, title, description, location, starts_at, ends_at, capacity, status, registration_deadline, created_at
       FROM workshops WHERE owner_user_id = $1 ORDER BY created_at DESC`,
      [identity.id]
    );
    res.status(200).json({ data: result.rows });
  });

  // GET /api/v1/organizer/workshops/:id - Get own workshop detail
  router.get("/organizer/workshops/:id", requireReadOrigin, requireOrganizerWithIdentity, async (req: Request, res: Response) => {
    const identity = (req as any).identity as Identity;
    const { id } = req.params;
    const result = await pool.query(
      `SELECT id, owner_user_id, title, description, location, starts_at, ends_at, capacity, status, registration_deadline, created_at
       FROM workshops WHERE id = $1 AND owner_user_id = $2`,
      [id, identity.id]
    );
    if (!result.rowCount) return res.status(404).json(fail("NOT_FOUND", "Workshop not found or access denied"));
    res.status(200).json({ data: result.rows[0] });
  });

  // PATCH /api/v1/organizer/workshops/:id - Update owned DRAFT
  router.patch("/organizer/workshops/:id", requireOrigin, requireOrganizerWithIdentity, async (req: Request, res: Response) => {
    const identity = (req as any).identity as Identity;
    const { id } = req.params;
    const body = req.body || {};
    const { title, description, location, starts_at, ends_at, capacity, registration_deadline } = body;
    const hasRegistrationDeadline = Object.prototype.hasOwnProperty.call(body, "registration_deadline");

    // Check ownership and DRAFT status
    const current = await pool.query(
      "SELECT status, starts_at, ends_at, registration_deadline FROM workshops WHERE id = $1 AND owner_user_id = $2",
      [id, identity.id]
    );
    if (!current.rowCount) return res.status(404).json(fail("NOT_FOUND", "Workshop not found or access denied"));
    if (current.rows[0].status !== "DRAFT") return res.status(409).json(fail("INVALID_STATE", "Cannot update a published workshop"));

    // BR-08 Update validation
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
    const mergedStart = starts_at == null
      ? current.rows[0].starts_at as Date | null
      : start;
    const mergedDeadline = hasRegistrationDeadline
      ? deadline
      : current.rows[0].registration_deadline as Date | null;
    if (mergedStart && mergedDeadline && mergedDeadline > mergedStart) {
      return res.status(400).json(fail("VALIDATION", "Registration deadline cannot be later than start time"));
    }
    const mergedEnd = ends_at == null ? current.rows[0].ends_at as Date | null : end;
    if (mergedStart && mergedEnd && mergedEnd <= mergedStart) {
      return res.status(400).json(fail("VALIDATION", "End time must be after start time"));
    }

    try {
      const result = await pool.query(
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
      res.status(200).json({ data: result.rows[0] });
    } catch (err) {
      res.status(400).json(fail("VALIDATION", "Invalid workshop data"));
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
         RETURNING id, owner_user_id, title, description, location, starts_at, ends_at, capacity, status, registration_deadline, updated_at`,
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

  return router;
}
