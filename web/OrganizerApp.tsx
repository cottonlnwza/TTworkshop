/// <reference types="vite/client" />
import React, { useEffect, useState, type FormEvent } from "react";

type Workshop = {
  id: string;
  owner_user_id: string;
  title: string | null;
  description: string | null;
  location: string | null;
  starts_at: string | null;
  ends_at: string | null;
  capacity: number | null;
  status: "DRAFT" | "PUBLISHED";
  registration_deadline: string | null;
  created_at: string;
};

type View = "list" | "new" | "detail";

const apiUrl = "/api/v1";
// Read from Vite environment variable, falling back to the configured university timezone example.
const UNIVERSITY_TZ = import.meta.env.VITE_UNIVERSITY_TIMEZONE || "Asia/Bangkok";
const universityDateParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: UNIVERSITY_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23"
});

type WorkshopInput = Pick<Workshop,
  "title" | "description" | "location" | "starts_at" | "ends_at" | "capacity" | "registration_deadline">;

function dateTimeLocal(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = universityDateParts.formatToParts(date);
  const get = (type: string) => parts.find(part => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

function localDateTimeToIso(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, yearText, monthText, dayText, hourText, minuteText] = match;
  const [year, month, day, hour, minute] = [yearText, monthText, dayText, hourText, minuteText].map(Number);
  const targetAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  const check = new Date(targetAsUtc);
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 ||
      check.getUTCDate() !== day || check.getUTCHours() !== hour || check.getUTCMinutes() !== minute) return null;

  let timestamp = targetAsUtc;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = universityDateParts.formatToParts(new Date(timestamp));
    const get = (type: string) => Number(parts.find(part => part.type === type)?.value);
    const representedAsUtc = Date.UTC(
      get("year"), get("month") - 1, get("day"), get("hour"), get("minute")
    );
    timestamp += targetAsUtc - representedAsUtc;
  }
  const result = new Date(timestamp).toISOString();
  return dateTimeLocal(result) === value ? result : null;
}

function formatDisplay(value: string): string {
  return new Date(value).toLocaleString("th-TH", {
    timeZone: UNIVERSITY_TZ,
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function workshopPayload(form: HTMLFormElement): WorkshopInput {
  const values = new FormData(form);
  const text = (name: string): string | null => {
    const value = values.get(name);
    return typeof value === "string" && value.trim() ? value.trim() : null;
  };
  const date = (name: string): string | null => {
    const value = values.get(name);
    if (typeof value !== "string" || !value) return null;
    return localDateTimeToIso(value);
  };
  const rawCapacity = values.get("capacity");
  return {
    title: text("title"),
    description: text("description"),
    location: text("location"),
    starts_at: date("starts_at"),
    ends_at: date("ends_at"),
    capacity: typeof rawCapacity === "string" && rawCapacity.trim() ? Number(rawCapacity) : null,
    registration_deadline: date("registration_deadline")
  };
}

function responseError(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "error" in body) {
    const error = body.error;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
      return error.message;
    }
  }
  return fallback;
}

export function OrganizerApp() {
  const [view, setView] = useState<View>("list");
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (view === "list") fetchWorkshops();
  }, [view]);

  async function fetchWorkshops() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${apiUrl}/organizer/workshops`, {
        credentials: "same-origin",
        headers: { "Origin": window.location.origin }
      });
      if (!res.ok) throw new Error("Failed to fetch workshops");
      const data = await res.json();
      setWorkshops(data.data || []);
    } catch {
      setError("Unable to load workshops. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    setError("");
    try {
      const res = await fetch(`${apiUrl}/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: { "Origin": window.location.origin }
      });
      if (!res.ok) throw new Error("Unable to sign out. Please try again.");
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign out. Please try again.");
      setSigningOut(false);
    }
  }

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = e.currentTarget;
    const payload = workshopPayload(form);

    try {
      const res = await fetch(`${apiUrl}/workshops`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "Origin": window.location.origin },
        body: JSON.stringify(payload)
      });
      const data: unknown = await res.json();
      if (!res.ok) throw new Error(responseError(data, "Failed to create draft"));
      setSuccess("Draft created successfully!");
      form.reset();
      setView("list");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create draft");
    } finally {
      setLoading(false);
    }
  }

  async function handlePublish(id: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${apiUrl}/organizer/workshops/${id}/publish`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Origin": window.location.origin }
      });
      const data: unknown = await res.json();
      if (!res.ok) throw new Error(responseError(data, "Failed to publish"));
      setSuccess("Workshop published successfully!");
      setView("list");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <h1>Organizer workspace</h1>
      <header>
        <span className="brand">TT / WORKSHOP</span>
        <span className="tag">Organizer Dashboard</span>
        <button onClick={() => setView("list")} style={{ marginLeft: "auto" }}>Back to List</button>
        <button type="button" onClick={handleSignOut} disabled={signingOut}>
          {signingOut ? "Signing out..." : "Sign out"}
        </button>
      </header>

      {error && <p role="alert" className="error">{error}</p>}
      {success && <p role="status" className="success">{success}</p>}

      {view === "list" && (
        <section className="panel">
          <h2>My Workshops</h2>
          {loading ? <p>Loading...</p> : workshops.length === 0 ? (
            <p className="muted">No workshops yet. Create your first draft!</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {workshops.map(w => (
                <li key={w.id} style={{ marginBottom: "1rem", padding: "1rem", border: "1px solid #ccc", borderRadius: "4px" }}>
                  <strong>{w.title || "Untitled Draft"}</strong> 
                  <span style={{ marginLeft: "0.5rem", padding: "0.2rem 0.5rem", background: w.status === "PUBLISHED" ? "#d4edda" : "#fff3cd", borderRadius: "4px" }}>
                    {w.status}
                  </span>
                  <p className="muted">{w.location || "No location"} · {w.starts_at ? formatDisplay(w.starts_at) : "No date"}</p>
                  {w.status === "DRAFT" && (
                    <button onClick={() => { setSelectedId(w.id); setView("detail"); }}>Edit / Publish</button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <button onClick={() => { setError(""); setSuccess(""); setView("new"); }} style={{ marginTop: "1rem" }}>
            Create New Draft
          </button>
        </section>
      )}

      {view === "new" && (
        <section className="panel">
          <h2>Create Workshop Draft</h2>
          <form onSubmit={handleCreate} noValidate>
            <label>Title (required to publish)</label>
            <input name="title" type="text" />
            <label>Description (required to publish)</label>
            <textarea name="description" rows={3}></textarea>
            <label>Location (required to publish)</label>
            <input name="location" type="text" />
            <label>Start Time (required to publish)</label>
            <input name="starts_at" type="datetime-local" />
            <label>End Time (required to publish)</label>
            <input name="ends_at" type="datetime-local" />
            <label>Capacity (required to publish, &gt; 0)</label>
            <input name="capacity" type="number" min="1" />
            <label>Registration Deadline (optional, must be &le; start time)</label>
            <input name="registration_deadline" type="datetime-local" />
            <button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Draft"}</button>
          </form>
        </section>
      )}

      {view === "detail" && selectedId && <WorkshopDetail id={selectedId} onPublish={handlePublish} onBack={() => setView("list")} />}

      <footer>F-02 Organizer Workshop Draft & Publish</footer>
    </main>
  );
}

function WorkshopDetail({ id, onPublish, onBack }: { id: string; onPublish: (id: string) => void; onBack: () => void }) {
  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function fetchWorkshop() {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/organizer/workshops/${id}`, {
        credentials: "same-origin",
        headers: { "Origin": window.location.origin }
      });
      const data: unknown = await res.json();
      if (!res.ok) throw new Error(responseError(data, "Workshop not found"));
      if (!data || typeof data !== "object" || !("data" in data)) {
        throw new Error("Unexpected workshop response");
      }
      setWorkshop(data.data as Workshop);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Workshop not found");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void fetchWorkshop(); }, [id]);

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!workshop || workshop.status !== "DRAFT" || saving) return;
    setSaving(true);
    setSuccess("");
    try {
      const res = await fetch(`${apiUrl}/organizer/workshops/${workshop.id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "Origin": window.location.origin
        },
        body: JSON.stringify(workshopPayload(event.currentTarget))
      });
      const data: unknown = await res.json();
      if (!res.ok) throw new Error(responseError(data, "Update failed"));
      setSuccess("Draft updated successfully");
      setIsEditing(false);
      await fetchWorkshop();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p>Loading...</p>;
  if (!workshop) return <p className="error">{error || "Not found"}</p>;

  return (
    <section className="panel">
      <h2>{workshop.title || "Untitled Draft"}</h2>
      <p><strong>Status:</strong> {workshop.status}</p>
      {success && <p role="status" className="success">{success}</p>}

      {workshop.status === "DRAFT" && isEditing ? (
        <form onSubmit={handleUpdate} onChange={() => { if (error) setError(""); }} noValidate>
          {error && <p role="alert" className="error" style={{ color: "red" }}>{error}</p>}
          <label htmlFor="edit-title">Title (required to publish)</label>
          <input id="edit-title" name="title" type="text" defaultValue={workshop.title ?? ""} />
          <label htmlFor="edit-description">Description (required to publish)</label>
          <textarea id="edit-description" name="description" rows={3} defaultValue={workshop.description ?? ""} />
          <label htmlFor="edit-location">Location (required to publish)</label>
          <input id="edit-location" name="location" type="text" defaultValue={workshop.location ?? ""} />
          <label htmlFor="edit-starts-at">Start Time (required to publish)</label>
          <input id="edit-starts-at" name="starts_at" type="datetime-local" defaultValue={dateTimeLocal(workshop.starts_at)} />
          <label htmlFor="edit-ends-at">End Time (required to publish)</label>
          <input id="edit-ends-at" name="ends_at" type="datetime-local" defaultValue={dateTimeLocal(workshop.ends_at)} />
          <label htmlFor="edit-capacity">Capacity (required to publish, &gt; 0)</label>
          <input id="edit-capacity" name="capacity" type="number" min="1" step="1" defaultValue={workshop.capacity ?? ""} />
          <label htmlFor="edit-deadline">Registration Deadline (optional, must be &le; start time)</label>
          <input id="edit-deadline" name="registration_deadline" type="datetime-local" defaultValue={dateTimeLocal(workshop.registration_deadline)} />
          <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</button>
          <button type="button" disabled={saving} onClick={() => { setIsEditing(false); setError(""); }}>Cancel</button>
        </form>
      ) : (
        <>
          <p><strong>Description:</strong> {workshop.description || "N/A"}</p>
          <p><strong>Location:</strong> {workshop.location || "N/A"}</p>
          <p><strong>Start:</strong> {workshop.starts_at ? formatDisplay(workshop.starts_at) : "N/A"}</p>
          <p><strong>End:</strong> {workshop.ends_at ? formatDisplay(workshop.ends_at) : "N/A"}</p>
          <p><strong>Capacity:</strong> {workshop.capacity ?? "N/A"}</p>
          <p><strong>Deadline:</strong> {workshop.registration_deadline ? formatDisplay(workshop.registration_deadline) : "N/A"}</p>
          {workshop.status === "DRAFT" && (
            <>
              <button type="button" onClick={() => { setIsEditing(true); setError(""); }}>Edit Draft</button>
              <button type="button" onClick={() => onPublish(id)} style={{ marginTop: "1rem", marginLeft: "0.5rem", background: "#28a745", color: "white" }}>
                Publish Workshop
              </button>
            </>
          )}
        </>
      )}
      <button onClick={onBack} style={{ marginTop: "1rem", marginLeft: "1rem" }}>Back</button>
    </section>
  );
}
