import React, { useEffect, useState, type FormEvent } from "react";

type User = { id: string; email: string; role: "PARTICIPANT" | "ORGANIZER" };
type Mode = "loading" | "anonymous" | "authenticated";
const url = "/api/v1/auth";
function userFromReply(body: unknown): User | null {
  if (!body || typeof body !== "object" || !("data" in body)) return null;
  const data = body.data as { user?: User; id?: string; email?: string; role?: User["role"] };
  const user = data?.user ?? data;
  if (typeof user.id !== "string" || typeof user.email !== "string" ||
    (user.role !== "PARTICIPANT" && user.role !== "ORGANIZER")) return null;
  return user as User;
}

export function AuthApp() {
  const [mode,setMode] = useState<Mode>("loading");
  const [user,setUser] = useState<User | null>(null);
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [error,setError] = useState("");
  const [busy,setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    fetch(url + "/me", { credentials:"same-origin" })
      .then(async res => active ? (res.ok ? userFromReply(await res.json()) : null) : null)
      .then(found => { if (active) { setUser(found); setMode(found ? "authenticated" : "anonymous"); } })
      .catch(() => { if (active) { setUser(null); setMode("anonymous"); setError("Unable to check session"); } });
    return () => { active=false; };
  }, []);
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!email.trim() || !password) { setError("Email and password are required"); return; }
    setBusy(true);setError("");
    try {
      const response = await fetch(url+"/login", {
        method:"POST", headers:{"Content-Type":"application/json"},
        credentials:"same-origin", body:JSON.stringify({email,password})
      });
      if (!response.ok) {
        setError(response.status===401 ? "Invalid credentials" : response.status===400 ?
          "Please check your email and password" : "Sign in failed");
        return;
      }
      const found = userFromReply(await response.json());
      if (!found) { setError("Unexpected server response"); return; }
      setUser(found);setMode("authenticated");setPassword("");setEmail("");
    } catch { setError("Unable to contact server"); }
    finally { setBusy(false); }
  }
  async function logout() {
    if (busy) return;
    setBusy(true);setError("");
    try {
      const response = await fetch(url+"/logout",{ method:"POST",credentials:"same-origin" });
      if (response.status === 204 || response.status === 401) {
        setUser(null);setMode("anonymous");setPassword("");
      } else { setError("Could not sign out; try again"); }
    } catch { setError("Unable to contact server"); }
    finally { setBusy(false); }
  }
  return <main className="page">
    <header><span className="brand">TT / WORKSHOP</span><span className="tag">CPE334 · Sprint 1</span></header>
    <section className="panel" aria-label="Authentication">
      {mode==="loading" ? <p role="status">Checking your session…</p> : mode==="authenticated" && user ?
        <>
          <p className="eyebrow">SIGNED IN</p>
          <h1>{user.role==="ORGANIZER"?"Organizer workspace":"Participant workspace"}</h1>
          <p className="muted">Signed in as <strong>{user.email}</strong></p>
          <p className="note">Workshop and registration features are scheduled for F-02–F-04; this screen verifies authenticated identity only.</p>
          {error && <p role="alert" className="error">{error}</p>}
          <button disabled={busy} onClick={logout}>{busy?"Signing out…":"Sign out"}</button>
        </> :
        <>
          <p className="eyebrow">SECURE ACCESS</p>
          <h1>Welcome back</h1>
          <p className="muted">Sign in with a seeded Participant or Organizer account.</p>
          <form onSubmit={login} noValidate>
            <label htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="username" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} />
            <label htmlFor="password">Password</label>
            <input id="password" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} />
            {error && <p role="alert" className="error">{error}</p>}
            <button type="submit" disabled={busy}>{busy?"Signing in…":"Sign in"}</button>
          </form>
        </>
      }
    </section>
    <footer>F-01 Authentication · Session · Role authorization</footer>
  </main>;
}
