import React, { useCallback, useEffect, useState } from "react";
import { AuthApp } from "./AuthApp.js";
import { OrganizerApp } from "./OrganizerApp.js";
import { ParticipantApp } from "./ParticipantApp.js";

type User = { id: string; email: string; role: "PARTICIPANT" | "ORGANIZER" } | null;

export function App() {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/auth/me", { credentials: "same-origin" });
      if (!res.ok) {
        setUser(null);
        return;
      }
      const body: unknown = await res.json();
      if (!body || typeof body !== "object" || !("data" in body)) {
        setUser(null);
        return;
      }
      const found = body.data;
      if (!found || typeof found !== "object" || !("id" in found) || !("email" in found) || !("role" in found) ||
          typeof found.id !== "string" || typeof found.email !== "string" ||
          (found.role !== "ORGANIZER" && found.role !== "PARTICIPANT")) {
        setUser(null);
        return;
      }
      setUser({ id: found.id, email: found.email, role: found.role });
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  if (loading) return <p className="page">Loading...</p>;
  if (!user) return <AuthApp onLoginSuccess={checkAuth} />;
  if (user.role === "ORGANIZER") return <OrganizerApp />;
  return <ParticipantApp />;
}
