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
    const fullWorkshop = { ...workshop, capacity: 1, remaining_seats: 0, registration_open: false };
    const summary = {
      id: workshop.id, title: workshop.title, location: workshop.location, starts_at: workshop.starts_at,
      capacity: workshop.capacity, remaining_seats: workshop.remaining_seats, registration_open: true
    };
    const fullSummary = { ...summary, capacity: 1, remaining_seats: 0, registration_open: false };
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

  it("AC-F03-02/05: labels a full workshop Full and keeps registration disabled", async () => {
    const fullWorkshop = { ...workshop, capacity: 1, remaining_seats: 0, registration_open: false };
    const fullSummary = {
      id: workshop.id, title: workshop.title, location: workshop.location, starts_at: workshop.starts_at,
      capacity: 1, remaining_seats: 0, registration_open: false
    };
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: [fullSummary] }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: fullWorkshop }) }));
    render(<ParticipantApp />);
    fireEvent.click(await screen.findByRole("button", { name: "View details" }));
    expect(await screen.findByText((_, element) =>
      element?.tagName === "P" && element.textContent === "Registration: Full"
    )).toBeTruthy();
    expect((screen.getByRole("button", { name: "Register for workshop" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByText("Registration: Open")).toBeNull();
  });

  it("AC-F03-03/11: preserves confirmed registration when the post-success detail refresh fails", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: [{
        id: workshop.id, title: workshop.title, location: workshop.location, starts_at: workshop.starts_at,
        capacity: workshop.capacity, remaining_seats: workshop.remaining_seats, registration_open: true
      }] }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: workshop }) })
      .mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ data: {
        id: "reg-501", workshop_id: workshop.id, status: "ACTIVE", registered_at: "2026-11-07T00:00:00Z"
      } }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: [] }) })
      .mockRejectedValueOnce(new Error("detail refresh network failure"));
    vi.stubGlobal("fetch", fetcher);
    render(<ParticipantApp />);
    fireEvent.click(await screen.findByRole("button", { name: "View details" }));
    fireEvent.click(await screen.findByRole("button", { name: "Register for workshop" }));

    expect((await screen.findByRole("status")).textContent).toContain("Registration confirmed · reg-501 · ACTIVE");
    expect((await screen.findByRole("alert")).textContent).toContain("Registration succeeded, but availability could not be refreshed");
    expect((screen.getByRole("button", { name: "Already registered" }) as HTMLButtonElement).disabled).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(5);
  });
});
