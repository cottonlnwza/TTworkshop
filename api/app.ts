import express, { type Request, type Response, type NextFunction } from "express";
import { randomBytes, createHash } from "node:crypto";
import type { Pool } from "pg";
import { DUMMY_HASH, verifyPassword } from "./password.js";
import { createWorkshopRouter } from "./workshops.js";
import { createRegistrationRouter } from "./registrations.js";
type Role = "PARTICIPANT" | "ORGANIZER";
type Identity = { id: string; email: string; role: Role };
type Options = { appOrigin: string; production: boolean; sessionHours: number; now?: () => Date };
const COOKIE = "ttw_session";
const fail = (code: string, message: string) => ({ error: { code, message } });
function emailFrom(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && email.length >= 3 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}
function hashToken(value: string): string { return createHash("sha256").update(value).digest("hex"); }
function cookie(token: string, options: Options, clearing = false): string {
  return COOKIE + "=" + token + "; Path=/api/v1; HttpOnly; SameSite=Strict; Max-Age=" +
    (clearing ? 0 : Math.floor(options.sessionHours * 3600)) + (options.production ? "; Secure" : "");
}
function readToken(req: Request): string | null {
  const value = (req.headers.cookie ?? "").split(";").map(v => v.trim())
    .find(v => v.startsWith(COOKIE + "="))?.slice(COOKIE.length + 1) ?? "";
  return /^[0-9a-f]{64}$/.test(value) ? value : null;
}
function safeUser(row: { id: string | number; email: string; role: Role }): Identity {
  return { id: String(row.id), email: row.email, role: row.role };
}
/** F-01 only; role-protected feature write endpoints remain 501 until F-02/F-03. */
export function createApp(pool: Pool, options: Options) {
  const app = express();
  app.disable("x-powered-by");
  // Must run BEFORE body parsing: malformed JSON can fail in express.json and
  // still requires no-store on all auth responses (including error status 400).
  app.use("/api/v1/auth", (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  app.use(express.json({ limit: "8kb" }));
  const requireOrigin = (req: Request, res: Response, next: NextFunction) => {
    if (req.headers.origin !== options.appOrigin) {
      res.status(403).json(fail("FORBIDDEN_ORIGIN", "Request origin not allowed"));
      return;
    }
    next();
  };
  async function readSession(req: Request): Promise<{ identity: Identity; tokenHash: string } | null> {
    const token = readToken(req);
    if (!token) return null;
    const tokenHash = hashToken(token);
    const found = await pool.query<{ id: string; email: string; role: Role }>(
      "SELECT u.id,u.email,u.role FROM sessions s JOIN users u ON u.id=s.user_id " +
      "WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at > now() " +
      "AND u.role IN ('PARTICIPANT','ORGANIZER') LIMIT 1", [tokenHash]);
    if (!found.rowCount) return null;
    return { identity: safeUser(found.rows[0]!), tokenHash };
  }
  app.post("/api/v1/auth/login", requireOrigin, async (req, res) => {
    const email = emailFrom(req.body?.email);
    const password = req.body?.password;
    if (!email || typeof password !== "string" || password.length < 1 || password.length > 256) {
      res.status(400).json(fail("VALIDATION", "Email and password are required"));
      return;
    }
    const result = await pool.query<{ id: string; email: string; role: Role; password_hash: string }>(
      "SELECT id,email,role,password_hash FROM users WHERE email=$1 LIMIT 1", [email]);
    const user = result.rows[0];
    const valid = await verifyPassword(password, user?.password_hash ?? DUMMY_HASH);
    if (!user || !valid || !["PARTICIPANT","ORGANIZER"].includes(user.role)) {
      res.status(401).json(fail("INVALID_CREDENTIALS", "Invalid credentials"));
      return;
    }
    const token = randomBytes(32).toString("hex");
    await pool.query("INSERT INTO sessions(user_id,token_hash,expires_at) VALUES($1,$2,now()+($3 * interval '1 hour'))",
      [user.id, hashToken(token), options.sessionHours]);
    res.setHeader("Set-Cookie", cookie(token, options));
    res.status(200).json({ data: { user: safeUser(user) } });
  });
  app.get("/api/v1/auth/me", async (req, res) => {
    const current = await readSession(req);
    if (!current) { res.status(401).json(fail("UNAUTHENTICATED", "Sign in required")); return; }
    res.status(200).json({ data: current.identity });
  });
  app.post("/api/v1/auth/logout", requireOrigin, async (req, res) => {
    const current = await readSession(req);
    if (!current) { res.status(401).json(fail("UNAUTHENTICATED", "Sign in required")); return; }
    await pool.query("UPDATE sessions SET revoked_at=now() WHERE token_hash=$1 AND revoked_at IS NULL", [current.tokenHash]);
    res.setHeader("Set-Cookie", cookie("", options, true));
    res.status(204).end();
  });
  const requireRole = (role: Role) => async (req: Request, res: Response, next: NextFunction) => {
    const current = await readSession(req);
    if (!current) { res.status(401).json(fail("UNAUTHENTICATED", "Sign in required")); return; }
    if (current.identity.role !== role) { res.status(403).json(fail("FORBIDDEN", "Forbidden")); return; }
    (req as any).identity = current.identity;
    next();
  };

  const requireOrganizerWithIdentity = async (req: Request, res: Response, next: NextFunction) => {
    const current = await readSession(req);
    if (!current) { res.status(401).json(fail("UNAUTHENTICATED", "Sign in required")); return; }
    if (current.identity.role !== "ORGANIZER") { res.status(403).json(fail("FORBIDDEN", "Forbidden")); return; }
    (req as any).identity = current.identity;
    next();
  };

  const workshopRouter = createWorkshopRouter(pool, requireOrigin, requireOrganizerWithIdentity);
  app.use("/api/v1", workshopRouter);
  const registrationRouter = createRegistrationRouter(
    pool, requireRole("PARTICIPANT"), requireOrigin, requireRole("ORGANIZER"), options.now
  );
  app.use("/api/v1", registrationRouter);
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err && typeof err === "object" && "type" in err && err.type === "entity.parse.failed") {
      res.status(400).json(fail("VALIDATION", "Invalid JSON payload"));
      return;
    }
    res.status(500).json(fail("INTERNAL", "Internal error"));
  });
  return app;
}
