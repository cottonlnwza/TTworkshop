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
      const res = await fetch(`${apiUrl}/organizer/workshops`, { credentials: "same-origin" });
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
    const formData = new FormData(form);
    const payload: any = {};
    const title = formData.get("title");
    if (title) payload.title = String(title);
    const description = formData.get("description");
    if (description) payload.description = String(description);
    const location = formData.get("location");
    if (location) payload.location = String(location);
    const capacity = formData.get("capacity");
    if (capacity) payload.capacity = parseInt(String(capacity), 10);
    const starts_at = formData.get("starts_at");
    if (starts_at) payload.starts_at = String(starts_at);
    const ends_at = formData.get("ends_at");
    if (ends_at) payload.ends_at = String(ends_at);
    const registration_deadline = formData.get("registration_deadline");
    if (registration_deadline) payload.registration_deadline = String(registration_deadline);

    try {
      const res = await fetch(`${apiUrl}/workshops`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "Origin": window.location.origin },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to create draft");
      setSuccess("Draft created successfully!");
      form.reset();
      setView("list");
    } catch (err: any) {
      setError(err.message);
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to publish");
      setSuccess("Workshop published successfully!");
      setView("list");
    } catch (err: any) {
      setError(err.message);
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
                  <p className="muted">{w.location || "No location"} · {w.starts_at ? new Date(w.starts_at).toLocaleString() : "No date"}</p>
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
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${apiUrl}/organizer/workshops/${id}`, { credentials: "same-origin" })
      .then(res => res.ok ? res.json() : Promise.reject(new Error("Not found")))
      .then(data => setWorkshop(data.data))
      .catch(() => setError("Workshop not found"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p>Loading...</p>;
  if (error || !workshop) return <p className="error">{error || "Not found"}</p>;

  return (
    <section className="panel">
      <h2>{workshop.title || "Untitled Draft"}</h2>
      <p><strong>Status:</strong> {workshop.status}</p>
      <p><strong>Description:</strong> {workshop.description || "N/A"}</p>
      <p><strong>Location:</strong> {workshop.location || "N/A"}</p>
      <p><strong>Start:</strong> {workshop.starts_at ? new Date(workshop.starts_at).toLocaleString() : "N/A"}</p>
      <p><strong>End:</strong> {workshop.ends_at ? new Date(workshop.ends_at).toLocaleString() : "N/A"}</p>
      <p><strong>Capacity:</strong> {workshop.capacity ?? "N/A"}</p>
      <p><strong>Deadline:</strong> {workshop.registration_deadline ? new Date(workshop.registration_deadline).toLocaleString() : "N/A"}</p>
      
      {workshop.status === "DRAFT" && (
        <button onClick={() => onPublish(id)} style={{ marginTop: "1rem", background: "#28a745", color: "white" }}>
          Publish Workshop
        </button>
      )}
      <button onClick={onBack} style={{ marginTop: "1rem", marginLeft: "1rem" }}>Back</button>
    </section>
  );
}
