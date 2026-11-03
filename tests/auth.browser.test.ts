import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { chromium, type Browser } from "playwright-core";
import { createServer, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";
import { Pool } from "pg";
import type { Server } from "node:http";
import { createApp } from "../api/app.js";
import { migrate } from "../api/migrate.js";
import { hashPassword } from "../api/password.js";

const password = "synthetic-f01-password-not-for-production";
const pool = new Pool({ connectionString: process.env.PG_TEST_URL });
let api: Server;
let vite: ViteDevServer;
let browser: Browser;
let webOrigin: string;

beforeAll(async () => {
  if (!process.env.PG_TEST_URL?.includes("ttworkshop_test")) throw new Error("Dedicated test DB required");
  await migrate(pool);
  await pool.query("TRUNCATE TABLE sessions, users RESTART IDENTITY CASCADE");
  const hash = await hashPassword(password);
  await pool.query("INSERT INTO users(email,password_hash,role) VALUES($1,$2,'ORGANIZER')",
    ["organizer.a@example.test",hash]);
  await pool.query("INSERT INTO users(email,password_hash,role) VALUES($1,$2,'PARTICIPANT')",
    ["participant.a@example.test",hash]);

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
  const execPath = process.env.CHROME_PATH ??
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  browser = await chromium.launch({ executablePath:execPath, headless:true });
},30000);

afterAll(async () => {
  if (browser) await browser.close();
  if (vite) await vite.close();
  if (api) await new Promise<void>(resolve=>api.close(()=>resolve()));
  await pool.end();
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
      expect(await page.getByText(/Signed in as/).count()).toBe(1);
      await page.reload();
      await page.getByText("Organizer workspace").waitFor();
      await page.getByRole("button",{name:"Sign out"}).click();
      await page.getByRole("button",{name:"Sign in"}).waitFor();
      await page.reload();
      await page.getByRole("button",{name:"Sign in"}).waitFor();
      expect(await page.getByText("Organizer workspace").count()).toBe(0);
    } finally { await context.close(); }
  });
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
