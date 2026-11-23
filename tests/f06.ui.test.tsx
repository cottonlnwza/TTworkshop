// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { OrganizerApp } from "../web/OrganizerApp.js";
import { ParticipantApp } from "../web/ParticipantApp.js";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const publishedWorkshop = {
  id: "71",
  owner_user_id: "3",
  title: "F06 Managed Workshop",
  description: "Published workshop with closure controls",
  location: "Room 601",
  starts_at: "2026-12-20T10:00:00.000Z",
  ends_at: "2026-12-20T12:00:00.000Z",
  capacity: 10,
  status: "PUBLISHED" as const,
  registration_deadline: "2026-12-19T18:00:00.000Z",
  registration_closed: false,
  created_at: "2026-11-23T08:00:00.000Z"
};

describe("F-06 Manual Closure & Deadline UI states", () => {
  it("STS-F06-09: Organizer closes and reopens registration on a PUBLISHED workshop and displays 409 error cleanly", async () => {
    const closedWorkshop = { ...publishedWorkshop, registration_closed: true };
    const fetcher = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: [publishedWorkshop] }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: publishedWorkshop }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: closedWorkshop }) })
      .mockResolvedValueOnce({ ok: false, status: 409, json: async () => ({ error: { code: "DEADLINE_PASSED", message: "Registration deadline has passed" } }) });
    vi.stubGlobal("fetch", fetcher);

    render(<OrganizerApp />);
    // R-02: Organizer My Workshops list displays registration control state and deadline before opening details
    expect(await screen.findByText(/Registration:/)).toBeTruthy();
    expect(screen.getByText(/Deadline:/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Manage Registration" }));

    const closeBtn = await screen.findByRole("button", { name: "Close registration" });
    fireEvent.click(closeBtn);
    expect(await screen.findByText(/Manually Closed/)).toBeTruthy();

    const reopenBtn = await screen.findByRole("button", { name: "Reopen registration" });
    fireEvent.click(reopenBtn);
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Registration deadline has passed");
    expect(fetcher.mock.calls[2]![0]).toBe("/api/v1/organizer/workshops/71/close-registration");
    expect(fetcher.mock.calls[3]![0]).toBe("/api/v1/organizer/workshops/71/reopen-registration");
  });

  it("R-01: rejects nonempty invalid or badInput deadline without calling PATCH, updates valid deadline, and allows intentional blank reset to null", async () => {
    const updatedWorkshop = { ...publishedWorkshop, registration_deadline: "2026-12-18T08:00:00.000Z" };
    const resetWorkshop = { ...publishedWorkshop, registration_deadline: null };
    const fetcher = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: [publishedWorkshop] }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: publishedWorkshop }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: updatedWorkshop }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: resetWorkshop }) });
    vi.stubGlobal("fetch", fetcher);

    render(<OrganizerApp />);
    fireEvent.click(await screen.findByRole("button", { name: "Manage Registration" }));

    const input = await screen.findByLabelText(/Update Registration Deadline/i) as HTMLInputElement;
    // 1) Simulate fallback text input with invalid nonempty datetime (e.g., Feb 30)
    input.setAttribute("type", "text");
    input.value = "2026-02-30T10:00";
    expect(input.value).toBe("2026-02-30T10:00");
    fireEvent.click(screen.getByRole("button", { name: "Update deadline" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("valid registration deadline");
    // Must NOT send PATCH reset for invalid nonempty input
    expect(fetcher).toHaveBeenCalledTimes(2);

    // 2) Whitespace-only input is not genuinely blank -> rejected without PATCH
    input.setAttribute("type", "text");
    input.value = "   ";
    expect(input.value).toBe("   ");
    fireEvent.click(screen.getByRole("button", { name: "Update deadline" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(fetcher).toHaveBeenCalledTimes(2);

    // 3) Simulate native incomplete input (validity.badInput = true while value is "")
    input.setAttribute("type", "datetime-local");
    input.value = "";
    Object.defineProperty(input, "validity", {
      configurable: true,
      value: { badInput: true }
    });
    fireEvent.click(screen.getByRole("button", { name: "Update deadline" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(fetcher).toHaveBeenCalledTimes(2);

    // 4) Valid nonempty input submits exact ISO timestamp via PATCH
    Object.defineProperty(input, "validity", {
      configurable: true,
      value: { badInput: false }
    });
    fireEvent.change(input, { target: { value: "2026-12-18T15:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Update deadline" }));
    expect(await screen.findByText("Registration deadline updated")).toBeTruthy();
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(fetcher.mock.calls[2]![0]).toBe("/api/v1/organizer/workshops/71/registration-deadline");
    expect((fetcher.mock.calls[2]![1] as RequestInit).body).toBe(
      JSON.stringify({ registration_deadline: "2026-12-18T08:00:00.000Z" })
    );

    // 5) Intentional genuinely blank input (badInput = false, value = "") sends PATCH { registration_deadline: null }
    const syncedInput = await screen.findByLabelText(/Update Registration Deadline/i) as HTMLInputElement;
    Object.defineProperty(syncedInput, "validity", {
      configurable: true,
      value: { badInput: false }
    });
    fireEvent.change(syncedInput, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Update deadline" }));

    expect(await screen.findByText("Registration deadline updated")).toBeTruthy();
    expect(fetcher).toHaveBeenCalledTimes(4);
    expect(fetcher.mock.calls[3]![0]).toBe("/api/v1/organizer/workshops/71/registration-deadline");
    expect((fetcher.mock.calls[3]![1] as RequestInit).body).toBe(JSON.stringify({ registration_deadline: null }));
    // R-02: Published detail shows Default (start time) rather than N/A for null deadline
    expect(screen.getByText(/Default \(start time\)/)).toBeTruthy();
  });

  it("R-02: Organizer My Workshops list shows Manually Closed and Default (start time) for a closed default-deadline workshop", async () => {
    const closedDefaultWorkshop = {
      ...publishedWorkshop,
      registration_closed: true,
      registration_deadline: null
    };
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: [closedDefaultWorkshop] }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: closedDefaultWorkshop }) }));

    render(<OrganizerApp />);
    expect(await screen.findByText(/Manually Closed/)).toBeTruthy();
    expect(screen.getByText(/Default \(start time\)/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Manage Registration" }));
    expect(await screen.findByText(/Default \(start time\)/)).toBeTruthy();
  });

  it("STS-F06-02 / R-02: Participant discovery list AND detail show manually Closed state and detail disables registration", async () => {
    const summary = {
      id: "71",
      title: "F06 Closed Workshop",
      location: "Room 601",
      starts_at: "2026-12-20T10:00:00.000Z",
      capacity: 10,
      remaining_seats: 10,
      registration_closed: true,
      registration_open: false
    };
    const detail = {
      ...summary,
      description: "Seats remain but manually closed",
      ends_at: "2026-12-20T12:00:00.000Z",
      registration_deadline: "2026-12-19T18:00:00.000Z",
      status: "PUBLISHED" as const
    };
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: [summary] }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: detail }) }));

    render(<ParticipantApp />);
    // R-02: Assert Closed state directly in discovery list BEFORE opening details
    expect(await screen.findByText((_, el) =>
      el?.tagName === "P" && el.textContent === "Registration: Closed"
    )).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "View details" }));
    expect(await screen.findByText((_, el) =>
      el?.tagName === "P" && el.textContent === "Registration: Closed"
    )).toBeTruthy();
    expect((screen.getByRole("button", { name: "Register for workshop" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
