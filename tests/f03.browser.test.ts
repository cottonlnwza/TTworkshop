import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { chromium, type Browser } from "playwright-core";
import { existsSync } from "node:fs";
import { createServer, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";
import { Pool } from "pg";
import type { Server } from "node:http";
import { createApp } from "../api/app.js";
import { migrate } from "../api/migrate.js";
import { hashPassword } from "../api/password.js";
import { requireTestDatabaseUrl, assertTestDatabase } from "./helpers/testDatabase.js";

const password = "synthetic-f03-browser-password";
const participantEmail = "participant.browser@example.test";
const secondParticipantEmail = "participant.browser.second@example.test";
const organizerEmail = "organizer.browser@example.test";
const pool = new Pool({ connectionString: requireTestDatabaseUrl(process.env.PG_TEST_URL) });
let api: Server;
let vite: ViteDevServer;
let browser: Browser;
let webOrigin: string;
let workshopId: string;

function chromePath(): string | undefined {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  if (process.platform === "win32") {
    const paths = [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      process.env.LOCALAPPDATA ? `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe` : undefined
    ];
    return paths.find((path): path is string => Boolean(path && existsSync(path)));
  }
  if (process.platform === "darwin") {
    const path = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    return existsSync(path) ? path : undefined;
  }
  return undefined;
}

beforeAll(async () => {
  await assertTestDatabase(pool);
  await migrate(pool);
  const frontendPort = 15174;
  webOrigin = `http://127.0.0.1:${frontendPort}`;
  api = createApp(pool, { appOrigin: webOrigin, production: false, sessionHours: 8 }).listen(0, "127.0.0.1");
  await new Promise<void>(resolve => api.once("listening", resolve));
  const apiPort = (api.address() as { port: number }).port;
  vite = await createServer({
    configFile: false, root: "web", plugins: [react()],
    server: { host: "127.0.0.1", port: frontendPort, strictPort: true,
      proxy: { "/api": `http://127.0.0.1:${apiPort}` } }
  });
  await vite.listen();
  browser = await chromium.launch({ headless: true, ...(chromePath() ? { executablePath: chromePath() } : {}) });
}, 30000);

beforeEach(async () => {
  await pool.query("TRUNCATE TABLE workshops, sessions, users RESTART IDENTITY CASCADE");
  const participant = await hashPassword(password);
  const organizer = await hashPassword(password);
  await pool.query("INSERT INTO users(email,password_hash,role) VALUES($1,$2,'PARTICIPANT')", [participantEmail, participant]);
  await pool.query("INSERT INTO users(email,password_hash,role) VALUES($1,$2,'PARTICIPANT')",
    [secondParticipantEmail, await hashPassword(password)]);
  const owner = await pool.query(
    "INSERT INTO users(email,password_hash,role) VALUES($1,$2,'ORGANIZER') RETURNING id", [organizerEmail, organizer]
  );
  const startsAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);
  const created = await pool.query(
    `INSERT INTO workshops(owner_user_id,title,description,location,starts_at,ends_at,capacity,status)
     VALUES($1,'F03 Browser Workshop','Browser discovery and registration','Lab 3',$2,$3,3,'PUBLISHED') RETURNING id`,
    [owner.rows[0].id, startsAt, endsAt]
  );
  workshopId = String(created.rows[0].id);
});

afterAll(async () => {
  if (browser) await browser.close();
  if (vite) await vite.close();
  if (api) await new Promise<void>(resolve => api.close(() => resolve()));
  await pool.end();
});

describe("F-03 actual Chrome Participant journey", () => {
  it("STS-F03-02/03: Participant discovers a published workshop, opens details and registers persistently", async () => {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await page.goto(webOrigin);
      await page.getByLabel("Email").fill(participantEmail);
      await page.getByLabel("Password").fill(password);
      await page.getByRole("button", { name: "Sign in" }).click();
      await page.getByRole("heading", { name: "Discover workshops" }).waitFor();
      await page.getByRole("heading", { name: "F03 Browser Workshop" }).waitFor();
      await page.getByRole("button", { name: "View details" }).click();
      await page.getByRole("heading", { name: "F03 Browser Workshop" }).waitFor();
      await page.getByRole("button", { name: "Register for workshop" }).click();
      await page.getByRole("status").getByText(/Registration confirmed .* ACTIVE/).waitFor();
      expect(await page.getByRole("button", { name: "Already registered" }).isDisabled()).toBe(true);

      const stored = await pool.query(
        `SELECT r.status,u.email FROM registrations r JOIN users u ON u.id=r.participant_user_id
         WHERE r.workshop_id=$1`, [workshopId]
      );
      expect(stored.rows).toEqual([{ status: "ACTIVE", email: participantEmail }]);
      await page.getByRole("button", { name: "Back to workshops" }).click();
      await page.getByText("Seats remaining: 2 / 3").waitFor();
    } finally {
      await context.close();
    }
  }, 60000);

  it("STS-F03-11: A stale availability view shows a safe capacity conflict without false success", async () => {
    const context = await browser.newContext();
    try {
      await pool.query("UPDATE workshops SET capacity=1 WHERE id=$1", [workshopId]);
      const second = await pool.query("SELECT id FROM users WHERE email=$1", [secondParticipantEmail]);
      const page = await context.newPage();
      await page.goto(webOrigin);
      await page.getByLabel("Email").fill(secondParticipantEmail);
      await page.getByLabel("Password").fill(password);
      await page.getByRole("button", { name: "Sign in" }).click();
      await page.getByRole("heading", { name: "Discover workshops" }).waitFor();
      await page.getByRole("button", { name: "View details" }).click();
      await page.getByText("Seats remaining: 1 / 1").waitFor();

      const first = await pool.query("SELECT id FROM users WHERE email=$1", [participantEmail]);
      await pool.query("INSERT INTO registrations(workshop_id,participant_user_id,status) VALUES($1,$2,'ACTIVE')",
        [workshopId, first.rows[0].id]);

      await page.getByRole("button", { name: "Register for workshop" }).click();
      await page.getByRole("alert").getByText(/capacity is full/i).waitFor();
      expect(await page.getByRole("status").getByText(/Registration confirmed/).count()).toBe(0);
      await page.getByText("Seats remaining: 0 / 1").waitFor();
      expect(second.rows[0].id).toBeTruthy();
    } finally {
      await context.close();
    }
  }, 60000);
});
