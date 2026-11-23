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
    fireEvent.click(await screen.findByRole("button", { name: "Manage Registration" }));

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

  it("STS-F06-02: Participant discovery distinguishes manually Closed from Full and disables registration", async () => {
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
    fireEvent.click(await screen.findByRole("button", { name: "View details" }));
    expect(await screen.findByText((_, el) =>
      el?.tagName === "P" && el.textContent === "Registration: Closed"
    )).toBeTruthy();
    expect((screen.getByRole("button", { name: "Register for workshop" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
