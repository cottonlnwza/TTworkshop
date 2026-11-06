// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ParticipantApp } from "../web/ParticipantApp.js";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const workshop = {
  id: "41", title: "F03 UI Workshop", description: "Published description", location: "Room UI",
  starts_at: "2026-12-01T10:00:00.000Z", ends_at: "2026-12-01T12:00:00.000Z",
  capacity: 2, registration_deadline: null, remaining_seats: 2, registration_open: true
};

describe("F-03 Participant UI states", () => {
  it("STS-F03-02: shows loading then a safe empty state", async () => {
    let resolveFetch!: (value: unknown) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise(resolve => { resolveFetch = resolve; })));
    render(<ParticipantApp />);
    expect(screen.getByRole("status").textContent).toContain("Loading workshops");
    resolveFetch({ ok: true, status: 200, json: async () => ({ data: [] }) });
    expect(await screen.findByText("No published workshops are available right now.")).toBeTruthy();
  });

  it("STS-F03-02: displays a safe error when published discovery cannot load", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network unavailable")));
    render(<ParticipantApp />);
    expect((await screen.findByRole("alert")).textContent).toContain("network unavailable");
  });

  it("STS-F03-11: preserves a capacity conflict and refreshes stale availability", async () => {
    const fullWorkshop = { ...workshop, capacity: 1, remaining_seats: 0, registration_open: true };
    const summary = {
      id: workshop.id, title: workshop.title, location: workshop.location, starts_at: workshop.starts_at,
      capacity: workshop.capacity, remaining_seats: workshop.remaining_seats, registration_open: true
    };
    const fullSummary = { ...summary, capacity: 1, remaining_seats: 0 };
    const fetcher = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: [summary] }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: workshop }) })
      .mockResolvedValueOnce({ ok: false, status: 409, json: async () => ({ error: { code: "CAPACITY_FULL", message: "Workshop capacity is full" } }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: [fullSummary] }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: fullWorkshop }) });
    vi.stubGlobal("fetch", fetcher);
    render(<ParticipantApp />);
    fireEvent.click(await screen.findByRole("button", { name: "View details" }));
    fireEvent.click(await screen.findByRole("button", { name: "Register for workshop" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Workshop capacity is full");
    expect(await screen.findByText((_, element) =>
      element?.tagName === "P" && element.textContent?.includes("Seats remaining: 0 / 1") === true
    )).toBeTruthy();
    expect(screen.queryByText(/Registration confirmed/)).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(5);
  });
});
