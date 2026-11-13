/**
 * Issue #31: HTTP-only smoke against the real Compose UI/API/PostgreSQL stack.
 * Use synthetic demo accounts on disposable local data; never point at production.
 */
import { randomUUID } from "node:crypto";

const origin = process.env.APP_ORIGIN ?? "http://localhost:5173";
const password = process.env.SEED_PASSWORD;
const verifyTitle = process.argv[2] === "--verify" ? process.argv[3] : null;
if (!/^http:\/\/localhost:\d+$/.test(origin)) throw new Error("APP_ORIGIN must be a local Docker smoke URL");
if (!password || password.length < 12) throw new Error("Provide synthetic SEED_PASSWORD (>=12 chars)");

async function call(path, { method = "GET", body, cookie, expected = 200 } = {}) {
  const res = await fetch(`${origin}/api/v1${path}`, {
    method,
    headers: {
      origin,
      ...(cookie ? { cookie } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = res.status === 204 ? null : await res.json();
  if (res.status !== expected) {
    throw new Error(`${method} ${path} expected ${expected}, got ${res.status}: ${JSON.stringify(payload)}`);
  }
  return { payload, cookie: res.headers.get("set-cookie")?.split(";")[0] };
}

async function login(email) {
  const logged = await call("/auth/login", {
    method: "POST", body: { email, password }, expected: 200,
  });
  if (!logged.cookie?.startsWith("ttw_session=")) throw new Error(`Missing session cookie for ${email}`);
  return logged.cookie;
}

const web = await fetch(origin);
if (!web.ok || !(await web.text()).includes('src="/main.tsx"')) throw new Error("Vite UI not reachable");
const health = await fetch(`${origin}/api/v1/auth/me`);
if (health.status !== 401) throw new Error("Unauthenticated API did not return 401");

const organizer = await login("organizer.a@example.test");
const participantA = await login("participant.a@example.test");
const participantB = await login("participant.b@example.test");
if (verifyTitle) {
  const list = await call("/workshops", { cookie: participantA });
  if (!list.payload.data.some((w) => w.title === verifyTitle)) {
    throw new Error(`Persisted workshop missing after restart: ${verifyTitle}`);
  }
  console.log(`PERSISTENCE_VERIFIED ${verifyTitle}`);
  process.exit(0);
}

const title = `docker-issue31-${randomUUID()}`;
const start = new Date(Date.now() + 7 * 86400000);
const end = new Date(start.getTime() + 3600000);
const draft = await call("/workshops", {
  method: "POST", cookie: organizer, expected: 201,
  body: { title, description: "Synthetic Docker smoke", location: "Docker Lab", starts_at: start.toISOString(), ends_at: end.toISOString(), capacity: 1 },
});
const id = draft.payload.data.id;
await call(`/organizer/workshops/${id}/publish`, { method: "POST", cookie: organizer });
const visible = await call("/workshops", { cookie: participantA });
if (!visible.payload.data.some(w => String(w.id) === String(id))) throw new Error("Published workshop not visible");

await call(`/workshops/${id}/registrations`, { method: "POST", cookie: participantA, expected: 201 });
const duplicate = await call(`/workshops/${id}/registrations`, { method: "POST", cookie: participantA, expected: 409 });
if (duplicate.payload.error.code !== "CAPACITY_FULL" && duplicate.payload.error.code !== "DUPLICATE_ACTIVE") throw new Error("Unexpected duplicate error");
const full = await call(`/workshops/${id}/registrations`, { method: "POST", cookie: participantB, expected: 409 });
if (full.payload.error.code !== "CAPACITY_FULL") throw new Error("Capacity guard absent");
const roster = await call(`/organizer/workshops/${id}/registrations`, { cookie: organizer });
if (roster.payload.data.length !== 1) throw new Error("Organizer roster mismatch");
await call(`/organizer/workshops/${id}/registrations`, { cookie: participantA, expected: 403 });
const otherOwner = await login("organizer.b@example.test");
await call(`/organizer/workshops/${id}/registrations`, { cookie: otherOwner, expected: 404 });

console.log(`SMOKE_PASS ${title}`);
console.log(`Verify persistence after docker compose restart: SEED_PASSWORD=<same-synthetic-secret> node scripts/docker-smoke.mjs --verify ${title}`);
