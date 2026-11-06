import React, { useEffect, useState } from "react";

type WorkshopSummary = {
  id: string; title: string; location: string; starts_at: string;
  capacity: number; remaining_seats: number; registration_open: boolean;
};
type Workshop = WorkshopSummary & {
  description: string; ends_at: string; registration_deadline: string | null; status: "PUBLISHED";
};
type Registration = { id: string; workshop_id: string; status: "ACTIVE"; registered_at: string };
const api = "/api/v1";

function errorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "error" in body) {
    const error = body.error;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  }
  return fallback;
}

function displayTime(value: string): string {
  // Preserve the explicit offset; this feature does not guess the unselected university timezone.
  return value.replace("T", " ").replace(/\.\d{3}Z$/, "Z");
}

export function ParticipantApp() {
  const [workshops, setWorkshops] = useState<WorkshopSummary[]>([]);
  const [selected, setSelected] = useState<Workshop | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [registeredWorkshopIds, setRegisteredWorkshopIds] = useState<Set<string>>(() => new Set());
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadWorkshops() {
    setLoading(true); setError("");
    try {
      const response = await fetch(`${api}/workshops`, { credentials: "same-origin" });
      const body: unknown = await response.json();
      if (!response.ok) throw new Error(errorMessage(body, "Unable to load published workshops."));
      if (!body || typeof body !== "object" || !("data" in body) || !Array.isArray(body.data)) {
        throw new Error("Unexpected workshop response.");
      }
      setWorkshops(body.data as WorkshopSummary[]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load published workshops.");
    } finally { setLoading(false); }
  }

  useEffect(() => { void loadWorkshops(); }, []);

  async function viewDetails(workshop: WorkshopSummary) {
    setLoadingDetails(true); setError(""); setSelected(null);
    try {
      const response = await fetch(`${api}/workshops/${workshop.id}`, { credentials: "same-origin" });
      const body: unknown = await response.json();
      if (!response.ok) throw new Error(errorMessage(body, "Unable to load workshop details."));
      if (!body || typeof body !== "object" || !("data" in body)) throw new Error("Unexpected workshop response.");
      setSelected((body as { data: Workshop }).data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load workshop details.");
    } finally { setLoadingDetails(false); }
  }

  async function register() {
    if (!selected || registering || registeredWorkshopIds.has(selected.id) ||
        selected.remaining_seats <= 0 || !selected.registration_open) return;
    setRegistering(true); setError(""); setSuccess("");
    try {
      const response = await fetch(`${api}/workshops/${selected.id}/registrations`, {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json", Origin: window.location.origin }, body: "{}"
      });
      const body: unknown = await response.json();
      if (!response.ok) throw new Error(errorMessage(body, "Registration could not be completed."));
      const registration = (body as { data: Registration }).data;
      setRegisteredWorkshopIds(previous => new Set(previous).add(selected.id));
      setSuccess(`Registration confirmed · ${registration.id} · ACTIVE`);
      await loadWorkshops();
      const refreshed = await fetch(`${api}/workshops/${selected.id}`, { credentials: "same-origin" });
      if (refreshed.ok) setSelected((await refreshed.json() as { data: Workshop }).data);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Registration could not be completed.";
      await loadWorkshops();
      setError(message);
      const refreshed = await fetch(`${api}/workshops/${selected.id}`, { credentials: "same-origin" });
      if (refreshed.ok) setSelected((await refreshed.json() as { data: Workshop }).data);
    } finally { setRegistering(false); }
  }

  async function signOut() {
    setSigningOut(true); setError("");
    try {
      const response = await fetch(`${api}/auth/logout`, {
        method: "POST", credentials: "same-origin", headers: { Origin: window.location.origin }
      });
      if (!response.ok) throw new Error("Unable to sign out. Please try again.");
      window.location.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign out. Please try again.");
      setSigningOut(false);
    }
  }

  return <main className="page">
    <header>
      <span className="brand">TT / WORKSHOP</span><span className="tag">Participant · Sprint 1</span>
      <button type="button" onClick={signOut} disabled={signingOut} style={{ marginLeft: "auto", width: "auto" }}>
        {signingOut ? "Signing out…" : "Sign out"}
      </button>
    </header>
    <section className="panel" aria-label="Participant workshops">
      <p className="eyebrow">PUBLISHED WORKSHOPS</p>
      <h1>Discover workshops</h1>
      <p className="muted">Browse published workshops and check current seat availability.</p>
      {error && <p role="alert" className="error">{error}</p>}
      {success && <p role="status" className="success">{success}</p>}
      {selected ? <article aria-label="Workshop details">
        <h2>{selected.title}</h2><p>{selected.description}</p>
        <p><strong>Location:</strong> {selected.location}</p>
        <p><strong>Starts:</strong> {displayTime(selected.starts_at)}</p>
        <p><strong>Ends:</strong> {displayTime(selected.ends_at)}</p>
        <p><strong>Seats remaining:</strong> {selected.remaining_seats} / {selected.capacity}</p>
        <p><strong>Registration:</strong> {selected.registration_open ? "Open" : "Closed"}</p>
        <button type="button" disabled={registering || registeredWorkshopIds.has(selected.id) ||
          selected.remaining_seats <= 0 || !selected.registration_open} onClick={register}>
          {registering ? "Registering…" : registeredWorkshopIds.has(selected.id) ? "Already registered" : "Register for workshop"}
        </button>
        <button type="button" className="secondary" onClick={() => { setSelected(null); setError(""); }}>Back to workshops</button>
      </article> : loadingDetails ? <p role="status">Loading workshop details…</p> : loading ? <p role="status">Loading workshops…</p> : workshops.length === 0 ?
        <p className="muted">No published workshops are available right now.</p> :
        <ul className="workshop-list">{workshops.map(workshop => <li key={workshop.id}>
          <h2>{workshop.title}</h2><p className="muted">{workshop.location} · {displayTime(workshop.starts_at)}</p>
          <p>Seats remaining: {workshop.remaining_seats} / {workshop.capacity}</p>
          <button type="button" onClick={() => { void viewDetails(workshop); }}>View details</button>
        </li>)}</ul>}
      <button type="button" className="secondary" onClick={() => { setSelected(null); void loadWorkshops(); }} disabled={loading}>
        Refresh workshops
      </button>
    </section>
    <footer>F-03 Published Workshop Discovery & Registration</footer>
  </main>;
}
