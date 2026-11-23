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

const password = "synthetic-f06-browser-password";
const participantEmail = "participant.f06.browser@example.test";
const organizerEmail = "organizer.f06.browser@example.test";
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
  if (!address || typeof address === "string") throw new Error("Unable to reserve F-06 API port");
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
    const timeout = setTimeout(() => { void fail("Timed out waiting for F-06 API", output); }, 15000);
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
    child.once("error", error => { void fail("F-06 API spawn error: " + error.message, output); });
    child.once("exit", (code, signal) => {
      if (!settled) void fail(`F-06 API exited early (${code}/${signal})`, output);
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
  await pool.query("TRUNCATE TABLE workshops, sessions, users RESTART IDENTITY CASCADE");
  const passwordHash = await hashPassword(password);
  const users = await pool.query(
    "INSERT INTO users(email,password_hash,role) VALUES ($1,$3,'PARTICIPANT'),($2,$3,'ORGANIZER') RETURNING id,role",
    [participantEmail, organizerEmail, passwordHash]
  );
  const organizerId = String(users.rows.find(row => row.role === "ORGANIZER").id);
  await pool.query(
    "INSERT INTO workshops(owner_user_id,title,description,location,starts_at,ends_at,capacity,registration_deadline,status) " +
    "VALUES ($1,'F06 Browser Workshop','Manual closure E2E','Room 606','2026-12-20T10:00:00Z'," +
    "'2026-12-20T12:00:00Z',5,'2026-12-19T18:00:00Z','PUBLISHED')",
    [organizerId]
  );
});

afterAll(async () => {
  await browser?.close();
  await vite?.close();
  await stopApiProcess(apiProcess);
  await pool.end();
});

describe("F-06 real Chrome UI -> Express API -> PostgreSQL", () => {
  it("STS-F06-09: Organizer closes registration -> Participant sees Closed -> Organizer reopens -> Participant registers", async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      // 1. Organizer signs in and manually closes registration
      await page.goto(webOrigin);
      await page.fill('input[type="email"]', organizerEmail);
      await page.fill('input[type="password"]', password);
      await page.click('button:has-text("Sign in")');

      await page.waitForSelector('text=F06 Browser Workshop');
      await page.click('button:has-text("Manage Registration")');
      await page.waitForSelector('button:has-text("Close registration")');
      await page.click('button:has-text("Close registration")');
      await page.waitForSelector('text=Manually Closed');
      await page.click('button:has-text("Sign out")');

      // 2. Participant sees Closed with disabled register button
      await page.waitForSelector('input[type="email"]');
      await page.fill('input[type="email"]', participantEmail);
      await page.fill('input[type="password"]', password);
      await page.click('button:has-text("Sign in")');

      await page.waitForSelector('text=F06 Browser Workshop');
      await page.click('button:has-text("View details")');
      await page.waitForSelector('text=Registration: Closed');
      expect(await page.isDisabled('button:has-text("Register for workshop")')).toBe(true);
      await page.click('button:has-text("Sign out")');

      // 3. Organizer reopens registration
      await page.waitForSelector('input[type="email"]');
      await page.fill('input[type="email"]', organizerEmail);
      await page.fill('input[type="password"]', password);
      await page.click('button:has-text("Sign in")');

      await page.waitForSelector('text=F06 Browser Workshop');
      await page.click('button:has-text("Manage Registration")');
      await page.waitForSelector('button:has-text("Reopen registration")');
      await page.click('button:has-text("Reopen registration")');
      await page.waitForSelector('button:has-text("Close registration")');
      await page.click('button:has-text("Sign out")');

      // 4. Participant sees Open and registers cleanly
      await page.waitForSelector('input[type="email"]');
      await page.fill('input[type="email"]', participantEmail);
      await page.fill('input[type="password"]', password);
      await page.click('button:has-text("Sign in")');

      await page.waitForSelector('text=F06 Browser Workshop');
      await page.click('button:has-text("View details")');
      await page.waitForSelector('text=Registration: Open');
      await page.click('button:has-text("Register for workshop")');
      await page.waitForSelector('text=Registration confirmed');
    } finally {
      await context.close();
    }
  }, 60000);
});
