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
  registration_closed?: boolean;
  active_registrations_count?: number;
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
  const [startEditingPublished, setStartEditingPublished] = useState(false);
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
                    <button onClick={() => { setSelectedId(w.id); setStartEditingPublished(false); setView("detail"); }}>Edit / Publish</button>
                  )}
                  {w.status === "PUBLISHED" && (
                    <>
                      <p className="muted">
                        Registration: {w.registration_closed ? "Manually Closed" : "Open"} · Deadline:{" "}
                        {w.registration_deadline ? formatDisplay(w.registration_deadline) : "Default (start time)"}
                      </p>
                      <a href={"/organizer/workshops/" + encodeURIComponent(w.id) + "/registrations"}>
                        View registrations
                      </a>
                      <button
                        type="button"
                        onClick={() => { setSelectedId(w.id); setStartEditingPublished(false); setView("detail"); }}
                        style={{ marginLeft: "0.5rem" }}
                      >
                        Manage Registration
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSelectedId(w.id); setStartEditingPublished(true); setView("detail"); }}
                        style={{ marginLeft: "0.5rem" }}
                      >
                        Edit workshop
                      </button>
                    </>
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

      {view === "detail" && selectedId && (
        <WorkshopDetail
          id={selectedId}
          initialEditPublished={startEditingPublished}
          onPublish={handlePublish}
          onBack={() => { setStartEditingPublished(false); setView("list"); }}
        />
      )}

      <footer>F-02 Organizer Workshop Draft & Publish</footer>
    </main>
  );
}

function WorkshopDetail({
  id,
  initialEditPublished = false,
  onPublish,
  onBack
}: {
  id: string;
  initialEditPublished?: boolean;
  onPublish: (id: string) => void;
  onBack: () => void;
}) {
  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingPublished, setIsEditingPublished] = useState(initialEditPublished);
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

  async function handleToggleRegistration(action: "close" | "reopen") {
    if (!workshop || workshop.status !== "PUBLISHED" || saving) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const endpoint = action === "close" ? "close-registration" : "reopen-registration";
      const res = await fetch(`${apiUrl}/organizer/workshops/${workshop.id}/${endpoint}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Origin: window.location.origin },
        body: "{}"
      });
      const data: unknown = await res.json();
      if (!res.ok) throw new Error(responseError(data, "Unable to update registration status"));
      if (data && typeof data === "object" && "data" in data) {
        const next = data.data as Workshop;
        setWorkshop(prev => ({
          ...next,
          active_registrations_count: next.active_registrations_count ?? prev?.active_registrations_count
        }));
      }
      setSuccess(action === "close" ? "Registration closed" : "Registration reopened");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update registration status");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeadlineUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workshop || workshop.status !== "PUBLISHED" || saving) return;
    const inputEl = event.currentTarget.elements.namedItem("registration_deadline") as HTMLInputElement | null;
    if (inputEl?.validity?.badInput) {
      setSuccess("");
      setError("Please enter a valid registration deadline date and time.");
      return;
    }
    const rawFromInput = inputEl ? inputEl.value : new FormData(event.currentTarget).get("registration_deadline");
    const raw = typeof rawFromInput === "string" ? rawFromInput : "";
    let registration_deadline: string | null = null;
    if (raw !== "") {
      const converted = localDateTimeToIso(raw.trim());
      if (!converted) {
        setSuccess("");
        setError("Please enter a valid registration deadline date and time.");
        return;
      }
      registration_deadline = converted;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${apiUrl}/organizer/workshops/${workshop.id}/registration-deadline`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Origin: window.location.origin },
        body: JSON.stringify({ registration_deadline })
      });
      const data: unknown = await res.json();
      if (!res.ok) throw new Error(responseError(data, "Unable to update registration deadline"));
      if (data && typeof data === "object" && "data" in data) {
        const next = data.data as Workshop;
        setWorkshop(prev => ({
          ...next,
          active_registrations_count: next.active_registrations_count ?? prev?.active_registrations_count
        }));
      }
      setSuccess("Registration deadline updated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update registration deadline");
    } finally {
      setSaving(false);
    }
  }

  async function handlePublishedUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workshop || workshop.status !== "PUBLISHED" || saving) return;
    const form = event.currentTarget;
    const titleEl = form.elements.namedItem("title") as HTMLInputElement | null;
    const descEl = form.elements.namedItem("description") as HTMLTextAreaElement | null;
    const locEl = form.elements.namedItem("location") as HTMLInputElement | null;
    const capEl = form.elements.namedItem("capacity") as HTMLInputElement | null;
    const startEl = form.elements.namedItem("starts_at") as HTMLInputElement | null;
    const endEl = form.elements.namedItem("ends_at") as HTMLInputElement | null;
    const deadlineEl = form.elements.namedItem("registration_deadline") as HTMLInputElement | null;

    if (startEl?.validity?.badInput || endEl?.validity?.badInput || deadlineEl?.validity?.badInput) {
      setSuccess("");
      setError("Please enter valid date and time values.");
      return;
    }

    const title = (titleEl?.value ?? "").trim();
    const description = (descEl?.value ?? "").trim();
    const location = (locEl?.value ?? "").trim();
    if (!title || !description || !location) {
      setSuccess("");
      setError("Title, description, and location are required for a published workshop.");
      return;
    }

    const rawCap = (capEl?.value ?? "").trim();
    const capacity = Number(rawCap);
    if (!rawCap || !Number.isInteger(capacity) || capacity <= 0) {
      setSuccess("");
      setError("Capacity must be a positive integer.");
      return;
    }

    const payload: Record<string, unknown> = { title, description, location, capacity };

    const rawStart = startEl?.value ?? "";
    const initialStart = dateTimeLocal(workshop.starts_at);
    if (rawStart !== initialStart) {
      const convertedStart = localDateTimeToIso(rawStart.trim());
      if (!convertedStart) {
        setSuccess("");
        setError("Please enter a valid start date and time.");
        return;
      }
      payload.starts_at = convertedStart;
    }

    const rawEnd = endEl?.value ?? "";
    const initialEnd = dateTimeLocal(workshop.ends_at);
    if (rawEnd !== initialEnd) {
      const convertedEnd = localDateTimeToIso(rawEnd.trim());
      if (!convertedEnd) {
        setSuccess("");
        setError("Please enter a valid end date and time.");
        return;
      }
      payload.ends_at = convertedEnd;
    }

    const rawDeadline = deadlineEl?.value ?? "";
    const initialDeadline = dateTimeLocal(workshop.registration_deadline);
    if (rawDeadline !== initialDeadline) {
      if (rawDeadline === "") {
        payload.registration_deadline = null;
      } else {
        const convertedDeadline = localDateTimeToIso(rawDeadline.trim());
        if (!convertedDeadline) {
          setSuccess("");
          setError("Please enter a valid registration deadline date and time.");
          return;
        }
        payload.registration_deadline = convertedDeadline;
      }
    }

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${apiUrl}/organizer/workshops/${workshop.id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "Origin": window.location.origin
        },
        body: JSON.stringify(payload)
      });
      const data: unknown = await res.json();
      if (!res.ok) throw new Error(responseError(data, "Failed to update published workshop"));
      if (data && typeof data === "object" && "data" in data) {
        const next = data.data as Workshop;
        setWorkshop(prev => ({
          ...next,
          active_registrations_count: next.active_registrations_count ?? prev?.active_registrations_count
        }));
      }
      setIsEditingPublished(false);
      setSuccess("Published workshop updated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update published workshop");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p>Loading...</p>;
  if (!workshop) return <p className="error">{error || "Not found"}</p>;

  const activeCount = workshop.active_registrations_count ?? 0;
  const hasStarted = Boolean(workshop.starts_at && Date.now() >= new Date(workshop.starts_at).getTime());
  const hasEnded = Boolean(workshop.ends_at && Date.now() >= new Date(workshop.ends_at).getTime());
  const scheduleLocked = activeCount > 0 || hasStarted;

  return (
    <section className="panel">
      <h2>{workshop.title || "Untitled Draft"}</h2>
      <p><strong>Status:</strong> {workshop.status}</p>
      {workshop.status === "PUBLISHED" && (
        <>
          <p><strong>Registration Status:</strong> {workshop.registration_closed ? "Manually Closed" : "Open"}</p>
          <p><strong>Active Registrations:</strong> {activeCount} / {workshop.capacity ?? 0}</p>
        </>
      )}
      {!isEditing && !isEditingPublished && error && <p role="alert" className="error">{error}</p>}
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
      ) : workshop.status === "PUBLISHED" && isEditingPublished ? (
        <form onSubmit={handlePublishedUpdate} onChange={() => { if (error) setError(""); }} noValidate>
          {error && <p role="alert" className="error" style={{ color: "red" }}>{error}</p>}
          {hasEnded ? (
            <p className="muted">This workshop has ended; further edits are locked.</p>
          ) : scheduleLocked ? (
            <p className="muted">Schedule is locked (start/end time cannot be changed when active registrations exist or after start time).</p>
          ) : null}
          <label htmlFor="pub-edit-title">Title</label>
          <input id="pub-edit-title" name="title" type="text" defaultValue={workshop.title ?? ""} />
          <label htmlFor="pub-edit-description">Description</label>
          <textarea id="pub-edit-description" name="description" rows={3} defaultValue={workshop.description ?? ""} />
          <label htmlFor="pub-edit-location">Location</label>
          <input id="pub-edit-location" name="location" type="text" defaultValue={workshop.location ?? ""} />
          <label htmlFor="pub-edit-starts-at">Start Time</label>
          <input id="pub-edit-starts-at" name="starts_at" type="datetime-local" defaultValue={dateTimeLocal(workshop.starts_at)} />
          <label htmlFor="pub-edit-ends-at">End Time</label>
          <input id="pub-edit-ends-at" name="ends_at" type="datetime-local" defaultValue={dateTimeLocal(workshop.ends_at)} />
          <label htmlFor="pub-edit-capacity">Capacity (&ge; {activeCount} active)</label>
          <input id="pub-edit-capacity" name="capacity" type="number" min="1" step="1" defaultValue={workshop.capacity ?? ""} />
          <label htmlFor="pub-edit-deadline">Registration Deadline (optional, blank = start time)</label>
          <input id="pub-edit-deadline" name="registration_deadline" type="datetime-local" defaultValue={dateTimeLocal(workshop.registration_deadline)} />
          <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Published Changes"}</button>
          <button type="button" disabled={saving} onClick={() => { setIsEditingPublished(false); setError(""); }}>Cancel</button>
        </form>
      ) : (
        <>
          <p><strong>Description:</strong> {workshop.description || "N/A"}</p>
          <p><strong>Location:</strong> {workshop.location || "N/A"}</p>
          <p><strong>Start:</strong> {workshop.starts_at ? formatDisplay(workshop.starts_at) : "N/A"}</p>
          <p><strong>End:</strong> {workshop.ends_at ? formatDisplay(workshop.ends_at) : "N/A"}</p>
          <p><strong>Capacity:</strong> {workshop.capacity ?? "N/A"}</p>
          <p><strong>Deadline:</strong> {workshop.registration_deadline ? formatDisplay(workshop.registration_deadline) : workshop.status === "PUBLISHED" ? "Default (start time)" : "N/A"}</p>
          {workshop.status === "DRAFT" && (
            <>
              <button type="button" onClick={() => { setIsEditing(true); setError(""); }}>Edit Draft</button>
              <button type="button" onClick={() => onPublish(id)} style={{ marginTop: "1rem", marginLeft: "0.5rem", background: "#28a745", color: "white" }}>
                Publish Workshop
              </button>
            </>
          )}
          {workshop.status === "PUBLISHED" && (
            <div style={{ marginTop: "1rem" }}>
              <button type="button" disabled={saving} onClick={() => { setIsEditingPublished(true); setError(""); setSuccess(""); }} style={{ marginRight: "0.5rem" }}>
                Edit workshop
              </button>
              {workshop.registration_closed ? (
                <button type="button" disabled={saving} onClick={() => { void handleToggleRegistration("reopen"); }}>
                  {saving ? "Updating..." : "Reopen registration"}
                </button>
              ) : (
                <button type="button" disabled={saving} onClick={() => { void handleToggleRegistration("close"); }}>
                  {saving ? "Updating..." : "Close registration"}
                </button>
              )}
              <form onSubmit={handleDeadlineUpdate} style={{ marginTop: "1rem" }} noValidate>
                <label htmlFor="published-deadline">Update Registration Deadline (optional, blank = start time)</label>
                <input
                  key={`${workshop.id}:${workshop.registration_deadline ?? ""}`}
                  id="published-deadline"
                  name="registration_deadline"
                  type="datetime-local"
                  defaultValue={dateTimeLocal(workshop.registration_deadline)}
                />
                <button type="submit" disabled={saving}>{saving ? "Saving..." : "Update deadline"}</button>
              </form>
            </div>
          )}
        </>
      )}
      <button onClick={onBack} style={{ marginTop: "1rem", marginLeft: "1rem" }}>Back</button>
    </section>
  );
}
