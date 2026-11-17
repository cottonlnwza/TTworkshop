/** Real Chromium check against the Compose-exposed UI, without modifying app data. */
import { chromium } from "playwright-core";

const origin = process.env.APP_ORIGIN ?? "http://localhost:5173";
const password = process.env.SEED_PASSWORD;
if (!/^http:\/\/localhost:\d+$/.test(origin) || !password || password.length < 12) {
  throw new Error("Use a local APP_ORIGIN and synthetic SEED_PASSWORD");
}
const chrome = process.env.CHROME_PATH ?? (process.platform === "darwin"
  ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : undefined);
const browser = await chromium.launch({ headless: true, ...(chrome ? { executablePath: chrome } : {}) });
try {
  const page = await browser.newPage();
  await page.goto(origin);
  await page.getByLabel("Email").fill("participant.a@example.test");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  try {
    await page.getByText("Discover workshops").waitFor({ timeout: 15000 });
  } catch (error) {
    throw new Error(`Browser login UI not ready; visible text: ${(await page.locator('body').innerText()).slice(0,700)}`, { cause: error });
  }
  console.log("BROWSER_SMOKE_PASS participant authenticated via Compose UI/API/PostgreSQL");
} finally {
  await browser.close();
}
