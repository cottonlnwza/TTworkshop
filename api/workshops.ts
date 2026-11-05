import { Router, type Request, type Response, type RequestHandler } from "express";
import type { Pool } from "pg";

type Identity = { id: string; email: string; role: "PARTICIPANT" | "ORGANIZER" };
const fail = (code: string, message: string) => ({ error: { code, message } });

function parseDateTime(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

export function createWorkshopRouter(
  pool: Pool,
  requireOrigin: RequestHandler,
  requireOrganizerWithIdentity: RequestHandler
) {
  const router = Router();

  // POST /api/v1/workshops - Create partial DRAFT
  router.post("/workshops", requireOrigin, requireOrganizerWithIdentity, async (req: Request, res: Response) => {
    const identity = (req as any).identity as Identity;
    const { title, description, location, starts_at, ends_at, capacity, registration_deadline } = req.body || {};
    
    // BR-08 Create validation
    const start = starts_at ? parseDateTime(starts_at) : null;
    const deadline = registration_deadline ? parseDateTime(registration_deadline) : null;
    if (start && deadline && deadline > start) {
      return res.status(400).json(fail("VALIDATION", "Registration deadline cannot be later than start time"));
    }

    try {
      const result = await pool.query(
        `INSERT INTO workshops (owner_user_id, title, description, location, starts_at, ends_at, capacity, registration_deadline, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'DRAFT')
         RETURNING id, owner_user_id, title, description, location, starts_at, ends_at, capacity, status, registration_deadline, created_at`,
        [identity.id, title || null, description || null, location || null, start, start ? parseDateTime(ends_at as string) : null, capacity ? Number(capacity) : null, deadline]
      );
      res.status(201).json({ data: result.rows[0] });
    } catch (err) {
      res.status(400).json(fail("VALIDATION", "Invalid workshop data"));
    }
  });

  // GET /api/v1/organizer/workshops - List own workshops
  router.get("/organizer/workshops", requireOrigin, requireOrganizerWithIdentity, async (req: Request, res: Response) => {
    const identity = (req as any).identity as Identity;
    const result = await pool.query(
      `SELECT id, owner_user_id, title, description, location, starts_at, ends_at, capacity, status, registration_deadline, created_at
       FROM workshops WHERE owner_user_id = $1 ORDER BY created_at DESC`,
      [identity.id]
    );
    res.status(200).json({ data: result.rows });
  });

  // GET /api/v1/organizer/workshops/:id - Get own workshop detail
  router.get("/organizer/workshops/:id", requireOrigin, requireOrganizerWithIdentity, async (req: Request, res: Response) => {
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
    const { title, description, location, starts_at, ends_at, capacity, registration_deadline } = req.body || {};

    // Check ownership and DRAFT status
    const current = await pool.query("SELECT status FROM workshops WHERE id = $1 AND owner_user_id = $2", [id, identity.id]);
    if (!current.rowCount) return res.status(404).json(fail("NOT_FOUND", "Workshop not found or access denied"));
    if (current.rows[0].status !== "DRAFT") return res.status(409).json(fail("INVALID_STATE", "Cannot update a published workshop"));

    // BR-08 Update validation
    const start = starts_at ? parseDateTime(starts_at) : null;
    const deadline = registration_deadline ? parseDateTime(registration_deadline) : null;
    if (start && deadline && deadline > start) {
      return res.status(400).json(fail("VALIDATION", "Registration deadline cannot be later than start time"));
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
          registration_deadline = COALESCE($8, registration_deadline),
          updated_at = now()
         WHERE id = $1 AND owner_user_id = $9 AND status = 'DRAFT'
         RETURNING id, owner_user_id, title, description, location, starts_at, ends_at, capacity, status, registration_deadline, updated_at`,
        [id, title, description, location, start, start ? parseDateTime(ends_at as string) : null, capacity ? Number(capacity) : null, deadline, identity.id]
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

    const current = await pool.query(
      `SELECT id, owner_user_id, title, description, location, starts_at, ends_at, capacity, status, registration_deadline
       FROM workshops WHERE id = $1 AND owner_user_id = $2`,
      [id, identity.id]
    );
    if (!current.rowCount) return res.status(404).json(fail("NOT_FOUND", "Workshop not found or access denied"));
    const w = current.rows[0];
    if (w.status === "PUBLISHED") return res.status(409).json(fail("INVALID_STATE", "Workshop is already published"));

    // Publish validation (BR-02, BR-03, BR-08)
    if (!w.title || !w.description || !w.location || !w.starts_at || !w.ends_at || w.capacity == null) {
      return res.status(400).json(fail("VALIDATION", "Missing required fields for publication"));
    }
    if (w.ends_at <= w.starts_at) {
      return res.status(400).json(fail("VALIDATION", "End time must be after start time"));
    }
    if (w.capacity <= 0 || !Number.isInteger(w.capacity)) {
      return res.status(400).json(fail("VALIDATION", "Capacity must be a positive integer"));
    }
    if (w.registration_deadline && w.registration_deadline > w.starts_at) {
      return res.status(400).json(fail("VALIDATION", "Registration deadline cannot be later than start time"));
    }

    try {
      const result = await pool.query(
        `UPDATE workshops SET status = 'PUBLISHED', updated_at = now()
         WHERE id = $1 AND owner_user_id = $2 AND status = 'DRAFT'
         RETURNING id, owner_user_id, title, description, location, starts_at, ends_at, capacity, status, registration_deadline, updated_at`,
        [id, identity.id]
      );
      res.status(200).json({ data: result.rows[0] });
    } catch (err) {
      res.status(500).json(fail("INTERNAL", "Failed to publish workshop"));
    }
  });

  return router;
}
