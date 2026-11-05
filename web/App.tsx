import React, { useEffect, useState } from "react";
import { AuthApp } from "./AuthApp.js";
import { OrganizerApp } from "./OrganizerApp.js";

type User = { id: string; email: string; role: "PARTICIPANT" | "ORGANIZER" } | null;

export function App() {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/auth/me", { credentials: "same-origin" })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.data) setUser(data.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <p className="page">Loading...</p>;
  if (!user) return <AuthApp />;
  if (user.role === "ORGANIZER") return <OrganizerApp />;
  return <main className="page"><h1>Participant Workspace</h1><p>F-03/F-04 coming soon.</p></main>;
}
