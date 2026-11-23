import React, { useEffect, useState } from "react";

type Registration = {
  registration_id: string;
  status: string;
  registered_at: string;
  cancelled_at?: string | null;
  checked_in_at?: string | null;
  workshop: { workshop_id: string; title: string; starts_at: string };
};
type RosterRow = {
  registration_id: string;
  participant_id: string;
  status: string;
  registered_at: string;
  cancelled_at?: string | null;
  checked_in_at?: string | null;
};
type ViewError = "expired" | "forbidden" | "unavailable" | "general";
const api = "/api/v1";

function apiErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "error" in body) {
    const error = body.error;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
      return error.message;
    }
  }
  return fallback;
}

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
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [error, setError] = useState("");
  const [errorKind, setErrorKind] = useState<ViewError | null>(null);

  async function cancelRegistration(targetId: string) {
    if (cancellingId) return;
    setCancellingId(targetId);
    setActionError("");
    setActionMessage("");
    try {
      const response = await fetch(
        api + "/me/registrations/" + encodeURIComponent(targetId) + "/cancel",
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json", Origin: window.location.origin },
          body: "{}"
        }
      );
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 401) {
          setActionError("Your session has expired. Please sign in again.");
          return;
        }
        setActionError(apiErrorMessage(body, "Unable to cancel registration. Please try again."));
        return;
      }
      setActionMessage("Registration cancelled · CANCELLED");
      await load();
    } catch {
      setActionError("Unable to cancel registration. Please try again.");
    } finally {
      setCancellingId(null);
    }
  }

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
      {actionError && <p role="alert" className="error">{actionError}</p>}
      {actionMessage && <p role="status" className="success">{actionMessage}</p>}
      {!loading && !error && registrationId && detail && <>
        <h2>{detail.workshop.title}</h2>
        <p><strong>Registration:</strong> {detail.registration_id}</p>
        <p><strong>Status:</strong> {detail.status}</p>
        <p><strong>Workshop starts:</strong> {displayTime(detail.workshop.starts_at)}</p>
        <p><strong>Registered:</strong> {displayTime(detail.registered_at)}</p>
        {detail.cancelled_at && <p><strong>Cancelled:</strong> {displayTime(detail.cancelled_at)}</p>}
        {detail.checked_in_at && <p><strong>Attendance:</strong> Checked in ({displayTime(detail.checked_in_at)})</p>}
        {detail.status === "ACTIVE" && (
          <button
            type="button"
            disabled={cancellingId === detail.registration_id || Boolean(detail.checked_in_at)}
            onClick={() => { void cancelRegistration(detail.registration_id); }}
          >
            {cancellingId === detail.registration_id ? "Cancelling..." : "Cancel registration"}
          </button>
        )}
      </>}
      {!loading && !error && !registrationId && rows.length === 0 &&
        <p className="muted">You do not have any registrations yet.</p>}
      {!registrationId && rows.length > 0 && <ul className="workshop-list">
        {rows.map(row => <li key={row.registration_id}>
          <h2>{row.workshop.title}</h2>
          <p><strong>Status:</strong> {row.status}</p>
          <p><strong>Workshop starts:</strong> {displayTime(row.workshop.starts_at)}</p>
          <p><strong>Registered:</strong> {displayTime(row.registered_at)}</p>
          {row.cancelled_at && <p><strong>Cancelled:</strong> {displayTime(row.cancelled_at)}</p>}
          {row.checked_in_at && <p><strong>Attendance:</strong> Checked in ({displayTime(row.checked_in_at)})</p>}
          {row.status === "ACTIVE" && (
            <button
              type="button"
              disabled={cancellingId === row.registration_id || Boolean(row.checked_in_at)}
              onClick={() => { void cancelRegistration(row.registration_id); }}
            >
              {cancellingId === row.registration_id ? "Cancelling..." : "Cancel registration"}
            </button>
          )}
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
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [error, setError] = useState("");
  const [errorKind, setErrorKind] = useState<ViewError | null>(null);

  async function checkInRegistration(targetId: string) {
    if (checkingInId) return;
    setCheckingInId(targetId);
    setActionError("");
    setActionMessage("");
    try {
      const response = await fetch(
        api + "/organizer/workshops/" + encodeURIComponent(workshopId) +
        "/registrations/" + encodeURIComponent(targetId) + "/check-in",
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json", Origin: window.location.origin },
          body: "{}"
        }
      );
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 401) {
          setActionError("Your session has expired. Please sign in again.");
          return;
        }
        setActionError(apiErrorMessage(body, "Unable to check in participant. Please try again."));
        return;
      }
      if (body && typeof body === "object" && "data" in body && body.data) {
        const updated = body.data as RosterRow;
        setRows(previous => previous.map(r => r.registration_id === updated.registration_id ? updated : r));
      }
      setActionMessage("Participant checked in");
    } catch {
      setActionError("Unable to check in participant. Please try again.");
    } finally {
      setCheckingInId(null);
    }
  }

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
      {actionError && <p role="alert" className="error">{actionError}</p>}
      {actionMessage && <p role="status" className="success">{actionMessage}</p>}
      {!loading && !error && rows.length === 0 &&
        <p className="muted">No registrations for this workshop yet.</p>}
      {rows.length > 0 && <ul className="workshop-list">
        {rows.map(row => <li key={row.registration_id}>
          <p><strong>Registration:</strong> {row.registration_id}</p>
          <p><strong>Participant ID:</strong> {row.participant_id}</p>
          <p><strong>Status:</strong> {row.status}</p>
          <p><strong>Registered:</strong> {displayTime(row.registered_at)}</p>
          {row.cancelled_at && <p><strong>Cancelled:</strong> {displayTime(row.cancelled_at)}</p>}
          {row.checked_in_at ? (
            <p><strong>Attendance:</strong> Checked in ({displayTime(row.checked_in_at)})</p>
          ) : row.status === "ACTIVE" ? (
            <button
              type="button"
              disabled={checkingInId !== null}
              onClick={() => { void checkInRegistration(row.registration_id); }}
            >
              {checkingInId === row.registration_id ? "Checking in..." : "Check in"}
            </button>
          ) : null}
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
