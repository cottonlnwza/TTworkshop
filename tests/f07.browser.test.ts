import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { chromium, type Browser } from "playwright-core";
import { existsSync } from "node:fs";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer as createNetServer } from "node:net";
import { resolve } from "node:path";
import { createServer, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";
import { Pool } from "pg";
import { migrate } from "../api/migrate.js";
import { hashPassword } from "../api/password.js";
import { requireTestDatabaseUrl, assertTestDatabase } from "./helpers/testDatabase.js";

const password = "synthetic-f07-browser-password";
const participantAEmail = "participant.a.f07.browser@example.test";
const participantBEmail = "participant.b.f07.browser@example.test";
const organizerEmail = "organizer.f07.browser@example.test";
const databaseUrl = requireTestDatabaseUrl(process.env.PG_TEST_URL);
const pool = new Pool({ connectionString: databaseUrl });
let apiProcess: ChildProcess;
let apiPort: number;
let vite: ViteDevServer;
let browser: Browser;
let webOrigin: string;

function chromePath(): string | undefined {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  if (process.platform === "win32") {
    const paths = [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      process.env.LOCALAPPDATA ? process.env.LOCALAPPDATA + "\\Google\\Chrome\\Application\\chrome.exe" : undefined
    ];
    return paths.find((path): path is string => Boolean(path && existsSync(path)));
  }
  if (process.platform === "darwin") {
    const path = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    return existsSync(path) ? path : undefined;
  }
  return undefined;
}

async function reservePort(): Promise<number> {
  const server = createNetServer();
  await new Promise<void>((resolvePromise, rejectPromise) => {
    server.once("error", rejectPromise);
    server.listen(0, "127.0.0.1", resolvePromise);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Unable to reserve F-07 API port");
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

async function startApiProcess(): Promise<ChildProcess> {
  const child = spawn(process.execPath, [
    resolve(process.cwd(), "node_modules/tsx/dist/cli.mjs"),
    resolve(process.cwd(), "api/server.ts")
  ], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      APP_ORIGIN: webOrigin,
      PORT: String(apiPort),
      NODE_ENV: "test"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  return new Promise<ChildProcess>((resolvePromise, rejectPromise) => {
    let output = "";
    let settled = false;
    const timeout = setTimeout(() => { void fail("Timed out waiting for F-07 API", output); }, 15000);
    const fail = async (message: string, detail: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      await stopApiProcess(child);
      rejectPromise(new Error(message + "\n" + detail));
    };
    child.stdout?.setEncoding("utf8").on("data", (chunk: string) => {
      output += chunk;
      if (!settled && output.includes("localhost:" + apiPort)) {
        settled = true;
        clearTimeout(timeout);
        resolvePromise(child);
      }
    });
    child.stderr?.setEncoding("utf8").on("data", (chunk: string) => { output += chunk; });
    child.once("error", error => { void fail("F-07 API spawn error: " + error.message, output); });
    child.once("exit", (code, signal) => {
      if (!settled) void fail(`F-07 API exited early (${code}/${signal})`, output);
    });
  });
}

beforeAll(async () => {
  await assertTestDatabase(pool);
  await migrate(pool);
  apiPort = await reservePort();
  const webPort = await reservePort();
  webOrigin = `http://localhost:${webPort}`;
  apiProcess = await startApiProcess();
  vite = await createServer({
    root: resolve(process.cwd(), "web"),
    plugins: [react()],
    server: {
      host: "127.0.0.1",
      port: webPort,
      strictPort: true,
      proxy: { "/api": `http://127.0.0.1:${apiPort}` }
    }
  });
  await vite.listen();
  const executablePath = chromePath();
  browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {})
  });
}, 60000);

beforeEach(async () => {
  await pool.query("TRUNCATE TABLE registrations, workshops, sessions, users RESTART IDENTITY CASCADE");
  const passwordHash = await hashPassword(password);
  const users = await pool.query(
    "INSERT INTO users(email,password_hash,role) VALUES " +
    "($1,$4,'PARTICIPANT'),($2,$4,'PARTICIPANT'),($3,$4,'ORGANIZER') RETURNING id,email",
    [participantAEmail, participantBEmail, organizerEmail, passwordHash]
  );
  const byEmail = new Map<string, string>(users.rows.map(r => [r.email as string, String(r.id)]));
  const organizerId = byEmail.get(organizerEmail)!;
  const ws = await pool.query(
    "INSERT INTO workshops(owner_user_id,title,description,location,starts_at,ends_at,capacity,registration_deadline,status) " +
    "VALUES ($1,'F07 Browser Workshop','Published editing E2E','Room 707','2026-12-22T10:00:00Z'," +
    "'2026-12-22T12:00:00Z',4,'2026-12-21T18:00:00Z','PUBLISHED') RETURNING id",
    [organizerId]
  );
  const workshopId = String(ws.rows[0].id);
  // Seed 2 ACTIVE registrations so capacity < 2 must fail with CAPACITY_BELOW_ACTIVE
  await pool.query(
    "INSERT INTO registrations(workshop_id, participant_user_id, status) VALUES ($1,$2,'ACTIVE'),($1,$3,'ACTIVE')",
    [workshopId, byEmail.get(participantAEmail), byEmail.get(participantBEmail)]
  );
});

afterAll(async () => {
  await browser?.close();
  await vite?.close();
  await stopApiProcess(apiProcess);
  await pool.end();
});

describe("F-07 real Chrome UI -> Express API -> PostgreSQL", () => {
  it("STS-F07-10: Organizer attempts capacity < active_count (sees error alert), saves valid location & capacity, and persists across reload", async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await page.goto(webOrigin);
      await page.fill('input[type="email"]', organizerEmail);
      await page.fill('input[type="password"]', password);
      await page.click('button:has-text("Sign in")');

      await page.waitForSelector('text=F07 Browser Workshop');
      await page.click('button:has-text("Edit workshop")');
      await page.waitForSelector('text=Active Registrations: 2 / 4');

      // 1. Attempt invalid capacity < active_count (1 < 2) -> error alert
      await page.fill('#pub-edit-capacity', '1');
      await page.click('button:has-text("Save Published Changes")');
      await page.waitForSelector('[role="alert"]:has-text("Capacity cannot be reduced below current active registrations")');

      // 2. Save valid updated location & increased capacity (7)
      await page.fill('#pub-edit-location', 'Room 707-Updated');
      await page.fill('#pub-edit-capacity', '7');
      await page.click('button:has-text("Save Published Changes")');
      await page.waitForSelector('text=Published workshop updated');
      await page.waitForSelector('text=Room 707-Updated');
      await page.waitForSelector('text=Active Registrations: 2 / 7');

      // 3. Reload page and confirm persistence in My Workshops and detail
      await page.reload();
      await page.waitForSelector('text=F07 Browser Workshop');
      await page.waitForSelector('text=Room 707-Updated');
      await page.click('button:has-text("Edit workshop")');
      await page.waitForSelector('text=Active Registrations: 2 / 7');
    } finally {
      await context.close();
    }
  });
});
