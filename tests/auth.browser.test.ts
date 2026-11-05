import { afterAll, beforeAll, describe, expect, it } from "vitest";
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

const password = "synthetic-f01-password-not-for-production";
const pool = new Pool({ connectionString: requireTestDatabaseUrl(process.env.PG_TEST_URL) });
let api: Server;
let vite: ViteDevServer;
let browser: Browser;
let webOrigin: string;

function getChromePath(): string | undefined {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;

  if (process.platform === "win32") {
    const windowsPaths = [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      process.env.LOCALAPPDATA
        ? `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`
        : undefined,
    ];
    return windowsPaths.find((path): path is string => Boolean(path && existsSync(path)));
  }

  if (process.platform === "darwin") {
    const macPath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    return existsSync(macPath) ? macPath : undefined;
  }

  return undefined;
}

beforeAll(async () => {
  await assertTestDatabase(pool);
  await migrate(pool);
  await pool.query("TRUNCATE TABLE sessions, users RESTART IDENTITY CASCADE");
  await pool.query("INSERT INTO users(email,password_hash,role) VALUES($1,$2,'ORGANIZER')",
    ["organizer.a@example.test",await hashPassword(password)]);
  await pool.query("INSERT INTO users(email,password_hash,role) VALUES($1,$2,'PARTICIPANT')",
    ["participant.a@example.test",await hashPassword(password)]);

  // The browser and API have a single browser origin via Vite proxy, and the
  // API is bound to localhost only. A real Chromium process drives the UI.
  const frontendPort = 15173;
  webOrigin = "http://127.0.0.1:" + frontendPort;
  api = createApp(pool, { appOrigin:webOrigin, production:false, sessionHours:8 })
    .listen(0,"127.0.0.1");
  await new Promise<void>(resolve=>api.once("listening",resolve));
  const apiPort = (api.address() as {port:number}).port;
  vite = await createServer({
    configFile:false, root:"web", plugins:[react()],
    server:{ host:"127.0.0.1",port:frontendPort,strictPort:true,
      proxy:{ "/api": "http://127.0.0.1:"+apiPort }}
  });
  await vite.listen();
  const execPath = getChromePath();
  browser = await chromium.launch({ headless:true, ...(execPath ? { executablePath:execPath } : {}) });
},30000);

afterAll(async () => {
  if (browser) await browser.close();
  if (vite) await vite.close();
  if (api) await new Promise<void>(resolve=>api.close(()=>resolve()));
  await pool.end();
});

describe("F-02 actual Chrome UI to Express API to PostgreSQL", () => {
  it("STS-F02-08 Browser: Publish with missing fields shows validation error", async () => {
    const context = await browser.newContext();
    const title = `E2E-08-${Date.now()}`;
    try {
      const page = await context.newPage();
      await page.goto(webOrigin);
      await page.getByLabel("Email").fill("organizer.a@example.test");
      await page.getByLabel("Password").fill(password);
      await page.getByRole("button", { name: "Sign in" }).click();
      await page.getByText("Organizer workspace").waitFor();

      await page.getByRole("button", { name: "Create New Draft" }).click();
      await page.locator('input[name="title"]').fill(title);
      await page.getByRole("button", { name: "Save Draft" }).click();

      const draft = page.getByRole("listitem").filter({ hasText: title });
      await draft.waitFor();
      await draft.getByRole("button", { name: "Edit / Publish" }).click();
      await page.getByRole("button", { name: "Publish Workshop" }).click();
      await page.getByRole("alert")
        .getByText(/Missing required fields for publication/i)
        .waitFor({ timeout: 5000 });
      expect(await page.getByText("Status:").locator("..").innerText()).toContain("DRAFT");
    } finally {
      await context.close();
    }
  }, 60000);

  it("STS-F02-12 Browser: Create partial Draft, edit the same Draft, then publish", async () => {
    const context = await browser.newContext();
    const title = `E2E-12-${Date.now()}`;
    try {
      const page = await context.newPage();
      await page.goto(webOrigin);
      await page.getByLabel("Email").fill("organizer.a@example.test");
      await page.getByLabel("Password").fill(password);
      await page.getByRole("button", { name: "Sign in" }).click();
      await page.getByText("Organizer workspace").waitFor();

      await page.getByRole("button", { name: "Create New Draft" }).click();
      await page.locator('input[name="title"]').fill(title);
      await page.locator('textarea[name="description"]').fill("Browser E2E description");
      await page.getByRole("button", { name: "Save Draft" }).click();

      const draft = page.getByRole("listitem").filter({ hasText: title });
      await draft.waitFor();
      await draft.getByRole("button", { name: "Edit / Publish" }).click();
      await page.getByRole("button", { name: "Edit Draft" }).click();
      await page.locator('input[name="location"]').fill("E2E Test Location");
      await page.locator('input[name="starts_at"]').fill("2026-12-01T10:00");
      await page.locator('input[name="ends_at"]').fill("2026-12-01T12:00");
      await page.locator('input[name="capacity"]').fill("10");
      await page.getByRole("button", { name: "Save Changes" }).click();
      await page.getByRole("status").getByText(/Draft updated successfully/i)
        .waitFor({ timeout: 5000 });

      await page.getByRole("button", { name: "Publish Workshop" }).click();
      const published = page.getByRole("listitem").filter({ hasText: title });
      await published.getByText("PUBLISHED", { exact: true }).waitFor({ timeout: 5000 });
      expect(await published.getByRole("button", { name: "Edit / Publish" }).count()).toBe(0);
    } finally {
      await context.close();
    }
  }, 60000);
});

describe("F-01 actual Chrome UI → Express API → PostgreSQL", () => {
  it("STS-F01-01/02/06: Organizer signs in, sees private role, signs out, cannot see private state after reload", async () => {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await page.goto(webOrigin);
      await page.getByLabel("Email").fill("organizer.a@example.test");
      await page.getByLabel("Password").fill(password);
      await page.getByRole("button",{name:"Sign in"}).click();
      await page.getByText("Organizer workspace").waitFor();
      await page.reload();
      await page.getByText("Organizer workspace").waitFor();
      await page.getByRole("button",{name:"Sign out"}).click();
      await page.getByRole("button",{name:"Sign in"}).waitFor();
      await page.reload();
      await page.getByRole("button",{name:"Sign in"}).waitFor();
      expect(await page.getByText("Organizer workspace").count()).toBe(0);
    } finally { await context.close(); }
  }, 60000);
  it("STS-F01-03/08: malformed login is rejected, then Participant authenticates with only Participant role", async () => {
    const context=await browser.newContext();
    try {
      const page=await context.newPage();
      await page.goto(webOrigin);
      await page.getByRole("button",{name:"Sign in"}).click();
      await page.getByRole("alert").getByText(/required/).waitFor();
      await page.getByLabel("Email").fill("participant.a@example.test");
      await page.getByLabel("Password").fill("incorrect");
      await page.getByRole("button",{name:"Sign in"}).click();
      await page.getByText("Invalid credentials").waitFor();
      await page.getByLabel("Password").fill(password);
      await page.getByRole("button",{name:"Sign in"}).click();
      await page.getByText("Participant workspace").waitFor();
      expect(await page.getByText("Organizer workspace").count()).toBe(0);
    } finally { await context.close(); }
  });
});
