import React, { useEffect, useState } from "react";

type Registration = {
  registration_id: string;
  status: string;
  registered_at: string;
  workshop: { workshop_id: string; title: string; starts_at: string };
};
type RosterRow = {
  registration_id: string;
  participant_id: string;
  status: string;
  registered_at: string;
};
type ViewError = "expired" | "forbidden" | "unavailable" | "general";
const api = "/api/v1";

function displayTime(value: string): string {
  return new Date(value).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

function errorForStatus(status: number): { kind: ViewError; message: string } {
  if (status === 401) return { kind: "expired", message: "Your session has expired. Please sign in again." };
  if (status === 403) return { kind: "forbidden", message: "You do not have permission to view this information." };
  if (status === 404) return { kind: "unavailable", message: "This registration or workshop roster is unavailable." };
  return { kind: "general", message: "Unable to load registration information. Please try again." };
}

function ViewHeader({ title, backHref, backLabel }: {
  title: string; backHref: string; backLabel: string;
}) {
  return <header>
    <span className="brand">TT / WORKSHOP</span>
    <span className="tag">{title}</span>
    <a href={backHref} style={{ marginLeft: "auto" }}>{backLabel}</a>
  </header>;
}

export function ParticipantRegistrationViews({ registrationId }: { registrationId?: string }) {
  const [rows, setRows] = useState<Registration[]>([]);
  const [detail, setDetail] = useState<Registration | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [errorKind, setErrorKind] = useState<ViewError | null>(null);

  async function load(cursor?: string, append = false) {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError("");
    setErrorKind(null);
    try {
      const path = registrationId
        ? api + "/me/registrations/" + encodeURIComponent(registrationId)
        : api + "/me/registrations" + (cursor ? "?cursor=" + encodeURIComponent(cursor) : "");
      const response = await fetch(path, { credentials: "same-origin" });
      if (!response.ok) {
        const failure = errorForStatus(response.status);
        setError(failure.message);
        setErrorKind(failure.kind);
        setRows([]);
        setDetail(null);
        setNextCursor(null);
        return;
      }
      const body: unknown = await response.json();
      if (!body || typeof body !== "object" || !("data" in body)) {
        throw new Error("Unexpected response");
      }
      if (registrationId) {
        setDetail(body.data as Registration);
      } else {
        const page = body as { data: Registration[]; pagination?: { next_cursor?: string | null } };
        if (!Array.isArray(page.data) || !page.pagination) throw new Error("Unexpected response");
        setRows(previous => append ? [...previous, ...page.data] : page.data);
        setNextCursor(page.pagination.next_cursor ?? null);
      }
    } catch {
      setError("Unable to load registration information. Please try again.");
      setErrorKind("general");
      setRows([]);
      setDetail(null);
      setNextCursor(null);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => { void load(); }, [registrationId]);

  return <main className="page">
    <ViewHeader title="Participant registrations" backHref="/" backLabel="Back to workshops" />
    <section className="panel" aria-label="Participant registrations">
      <h1>{registrationId ? "Registration details" : "My registrations"}</h1>
      {loading ? <p role="status">Loading registrations...</p> : null}
      {error && <p role="alert" className="error" data-error-kind={errorKind}>{error}</p>}
      {!loading && !error && registrationId && detail && <>
        <h2>{detail.workshop.title}</h2>
        <p><strong>Registration:</strong> {detail.registration_id}</p>
        <p><strong>Status:</strong> {detail.status}</p>
        <p><strong>Workshop starts:</strong> {displayTime(detail.workshop.starts_at)}</p>
        <p><strong>Registered:</strong> {displayTime(detail.registered_at)}</p>
      </>}
      {!loading && !error && !registrationId && rows.length === 0 &&
        <p className="muted">You do not have any registrations yet.</p>}
      {!registrationId && rows.length > 0 && <ul className="workshop-list">
        {rows.map(row => <li key={row.registration_id}>
          <h2>{row.workshop.title}</h2>
          <p><strong>Status:</strong> {row.status}</p>
          <p><strong>Workshop starts:</strong> {displayTime(row.workshop.starts_at)}</p>
          <p><strong>Registered:</strong> {displayTime(row.registered_at)}</p>
          <a href={"/my-registrations/" + encodeURIComponent(row.registration_id)}>View registration</a>
        </li>)}
      </ul>}
      {!registrationId && nextCursor && !error &&
        <button type="button" disabled={loadingMore} onClick={() => { void load(nextCursor, true); }}>
          {loadingMore ? "Loading..." : "Load more registrations"}
        </button>}
    </section>
    <footer>F-04 Participant Registration Views</footer>
  </main>;
}

export function OrganizerRegistrationRoster({ workshopId }: { workshopId: string }) {
  const [rows, setRows] = useState<RosterRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [errorKind, setErrorKind] = useState<ViewError | null>(null);

  async function load(cursor?: string, append = false) {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError("");
    setErrorKind(null);
    try {
      const path = api + "/organizer/workshops/" + encodeURIComponent(workshopId) +
        "/registrations" + (cursor ? "?cursor=" + encodeURIComponent(cursor) : "");
      const response = await fetch(path, { credentials: "same-origin" });
      if (!response.ok) {
        const failure = errorForStatus(response.status);
        setError(failure.kind === "unavailable"
          ? "This workshop roster is unavailable."
          : failure.message);
        setErrorKind(failure.kind);
        setRows([]);
        setNextCursor(null);
        return;
      }
      const body: unknown = await response.json();
      if (!body || typeof body !== "object" || !("data" in body)) throw new Error("Unexpected response");
      const page = body as { data: RosterRow[]; pagination?: { next_cursor?: string | null } };
      if (!Array.isArray(page.data) || !page.pagination) throw new Error("Unexpected response");
      setRows(previous => append ? [...previous, ...page.data] : page.data);
      setNextCursor(page.pagination.next_cursor ?? null);
    } catch {
      setError("Unable to load the workshop roster. Please try again.");
      setErrorKind("general");
      setRows([]);
      setNextCursor(null);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => { void load(); }, [workshopId]);

  return <main className="page">
    <ViewHeader title="Organizer roster" backHref="/" backLabel="Back to workshops" />
    <section className="panel" aria-label="Workshop registration roster">
      <h1>Workshop registrations</h1>
      {loading ? <p role="status">Loading workshop roster...</p> : null}
      {error && <p role="alert" className="error" data-error-kind={errorKind}>{error}</p>}
      {!loading && !error && rows.length === 0 &&
        <p className="muted">No registrations for this workshop yet.</p>}
      {rows.length > 0 && <ul className="workshop-list">
        {rows.map(row => <li key={row.registration_id}>
          <p><strong>Registration:</strong> {row.registration_id}</p>
          <p><strong>Participant ID:</strong> {row.participant_id}</p>
          <p><strong>Status:</strong> {row.status}</p>
          <p><strong>Registered:</strong> {displayTime(row.registered_at)}</p>
        </li>)}
      </ul>}
      {nextCursor && !error &&
        <button type="button" disabled={loadingMore} onClick={() => { void load(nextCursor, true); }}>
          {loadingMore ? "Loading..." : "Load more registrations"}
        </button>}
    </section>
    <footer>F-04 Organizer Registration Views</footer>
  </main>;
}
