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

const password = "synthetic-f04-browser-password";
const participantEmail = "participant.f04.browser@example.test";
const organizerEmail = "organizer.f04.browser@example.test";
const databaseUrl = requireTestDatabaseUrl(process.env.PG_TEST_URL);
const pool = new Pool({ connectionString: databaseUrl });
let apiProcess: ChildProcess;
let apiPort: number;
let vite: ViteDevServer;
let browser: Browser;
let webOrigin: string;
let workshopId: string;
let participantId: string;

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
  if (!address || typeof address === "string") throw new Error("Unable to reserve API test port");
  const port = address.port;
  await new Promise<void>((resolvePromise, rejectPromise) => {
    server.close(error => error ? rejectPromise(error) : resolvePromise());
  });
  return port;
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
    const timeout = setTimeout(() => { void fail("Timed out waiting for F-04 API process", output); }, 15000);
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
    child.once("error", error => { void fail("F-04 API process failed to spawn: " + error.message, output); });
    child.once("exit", (code, signal) => {
      if (code !== null || signal !== null) void fail("F-04 API exited before startup (" + code + "/" + signal + ")", output);
    });
  });
}

async function stopApiProcess(child: ChildProcess | undefined): Promise<void> {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  await new Promise<void>(resolvePromise => {
    child.once("close", () => resolvePromise());
    if (!child.kill("SIGTERM")) resolvePromise();
  });
}

beforeAll(async () => {
  await assertTestDatabase(pool);
  await migrate(pool);
  apiPort = await reservePort();
  const frontendPort = 15175;
  webOrigin = "http://127.0.0.1:" + frontendPort;
  apiProcess = await startApiProcess();
  vite = await createServer({
    configFile: false,
    root: "web",
    plugins: [react()],
    server: {
      host: "127.0.0.1",
      port: frontendPort,
      strictPort: true,
      proxy: { "/api": "http://127.0.0.1:" + apiPort }
    }
  });
  await vite.listen();
  browser = await chromium.launch({ headless: true, ...(chromePath() ? { executablePath: chromePath() } : {}) });
}, 45000);

beforeEach(async () => {
  await pool.query("TRUNCATE TABLE workshops, sessions, users RESTART IDENTITY CASCADE");
  const hash = await hashPassword(password);
  const inserted = await pool.query(
    "INSERT INTO users(email,password_hash,role) VALUES " +
    "($1,$3,'PARTICIPANT'),($2,$3,'ORGANIZER') RETURNING id,email",
    [participantEmail, organizerEmail, hash]
  );
  participantId = String(inserted.rows.find(row => row.email === participantEmail)!.id);
  workshopId = "";
});

afterAll(async () => {
  if (browser) await browser.close();
  if (vite) await vite.close();
  await stopApiProcess(apiProcess);
  await pool.end();
});

describe("F-04 actual Chrome Organizer → Participant → Organizer journey", () => {
  it("STS-F04-07/08: publishes, registers, views own record and roster across an API process restart", async () => {
    const organizerContext = await browser.newContext();
    const participantContext = await browser.newContext();
    try {
      const organizerPage = await organizerContext.newPage();
      await organizerPage.goto(webOrigin);
      await organizerPage.getByLabel("Email").fill(organizerEmail);
      await organizerPage.getByLabel("Password").fill(password);
      await organizerPage.getByRole("button", { name: "Sign in" }).click();
      await organizerPage.getByRole("heading", { name: "Organizer workspace" }).waitFor();
      await organizerPage.getByRole("button", { name: "Create New Draft" }).click();
      await organizerPage.locator('input[name="title"]').fill("F04 Browser Journey Workshop");
      await organizerPage.locator('textarea[name="description"]').fill("Synthetic F04 end-to-end fixture");
      await organizerPage.locator('input[name="location"]').fill("F04 Test Room");
      await organizerPage.locator('input[name="starts_at"]').fill("2026-12-01T10:00");
      await organizerPage.locator('input[name="ends_at"]').fill("2026-12-01T11:00");
      await organizerPage.locator('input[name="capacity"]').fill("5");
      await organizerPage.getByRole("button", { name: "Save Draft" }).click();
      await organizerPage.getByText("F04 Browser Journey Workshop").waitFor();
      await organizerPage.getByRole("button", { name: "Edit / Publish" }).click();
      await organizerPage.getByRole("button", { name: "Publish Workshop" }).click();
      await organizerPage.getByRole("link", { name: "View registrations" }).waitFor();

      const workshop = await pool.query(
        "SELECT id FROM workshops WHERE title='F04 Browser Journey Workshop' AND status='PUBLISHED'"
      );
      workshopId = String(workshop.rows[0].id);

      const participantPage = await participantContext.newPage();
      await participantPage.goto(webOrigin);
      await participantPage.getByLabel("Email").fill(participantEmail);
      await participantPage.getByLabel("Password").fill(password);
      await participantPage.getByRole("button", { name: "Sign in" }).click();
      await participantPage.getByRole("heading", { name: "Discover workshops" }).waitFor();
      await participantPage.getByText("F04 Browser Journey Workshop").waitFor();
      await participantPage.getByRole("button", { name: "View details" }).click();
      await participantPage.getByRole("button", { name: "Register for workshop" }).click();
      await participantPage.getByRole("status").getByText(/Registration confirmed .* ACTIVE/).waitFor();
      await participantPage.getByRole("link", { name: "My registrations" }).click();
      await participantPage.getByRole("heading", { name: "My registrations" }).waitFor();
      await participantPage.getByRole("link", { name: "View registration" }).click();
      await participantPage.getByRole("heading", { name: "Registration details" }).waitFor();
      await participantPage.getByText("F04 Browser Journey Workshop").waitFor();

      const saved = await pool.query(
        "SELECT id,status FROM registrations WHERE workshop_id=$1 AND participant_user_id=$2",
        [workshopId, participantId]
      );
      expect(saved.rows).toHaveLength(1);
      expect(saved.rows[0].status).toBe("ACTIVE");
      const registrationId = String(saved.rows[0].id);
      await stopApiProcess(apiProcess);
      apiProcess = await startApiProcess();
      await participantPage.reload();
      await participantPage.getByRole("heading", { name: "Registration details" }).waitFor();
      await participantPage.getByText("Registration: " + registrationId, { exact: true }).waitFor();
      await participantPage.getByText("F04 Browser Journey Workshop").waitFor();
      await participantPage.goto(webOrigin + "/organizer/workshops/" + workshopId + "/registrations");
      await participantPage.getByRole("alert").getByText("do not have permission").waitFor();
      await participantPage.goto(webOrigin + "/my-registrations/" + registrationId);
      await participantPage.getByRole("heading", { name: "Registration details" }).waitFor();

      await organizerPage.reload();
      await organizerPage.goto(webOrigin + "/my-registrations");
      await organizerPage.getByRole("alert").getByText("do not have permission").waitFor();
      await organizerPage.goto(webOrigin);
      await organizerPage.getByRole("link", { name: "View registrations" }).waitFor();
      await organizerPage.getByRole("link", { name: "View registrations" }).click();
      await organizerPage.getByRole("heading", { name: "Workshop registrations" }).waitFor();
      await organizerPage.getByText("Registration: " + registrationId, { exact: true }).waitFor();
      await organizerPage.getByText("Participant ID: " + participantId, { exact: true }).waitFor();
      expect(await organizerPage.locator("body").innerText()).not.toContain(participantEmail);
    } finally {
      await participantContext.close();
      await organizerContext.close();
    }
  }, 120000);
});
