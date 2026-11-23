// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { OrganizerRegistrationRoster, ParticipantRegistrationViews } from "../web/RegistrationViews.js";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("F-08 Event Check-in UI states", () => {
  it("STS-F08-08: Organizer roster shows Check in only for unchecked ACTIVE rows, handles 409 CHECKIN_WINDOW_CLOSED alert, and transitions cleanly to Checked in on 200", async () => {
    const uncheckedActive = {
      registration_id: "101",
      participant_id: "11",
      status: "ACTIVE",
      registered_at: "2026-12-10T08:00:00.000000Z",
      cancelled_at: null,
      checked_in_at: null
    };
    const alreadyCheckedIn = {
      registration_id: "102",
      participant_id: "12",
      status: "ACTIVE",
      registered_at: "2026-12-10T09:00:00.000000Z",
      cancelled_at: null,
      checked_in_at: "2026-12-15T10:05:00.000000Z"
    };
    const cancelledRow = {
      registration_id: "103",
      participant_id: "13",
      status: "CANCELLED",
      registered_at: "2026-12-10T07:00:00.000000Z",
      cancelled_at: "2026-12-11T07:00:00.000000Z",
      checked_in_at: null
    };
    const checkedIn101 = {
      ...uncheckedActive,
      checked_in_at: "2026-12-15T10:10:00.000000Z"
    };

    const fetcher = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [uncheckedActive, alreadyCheckedIn, cancelledRow], pagination: { next_cursor: null } })
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ error: { code: "CHECKIN_WINDOW_CLOSED", message: "Check-in has not opened yet" } })
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: checkedIn101 })
      });
    vi.stubGlobal("fetch", fetcher);

    render(<OrganizerRegistrationRoster workshopId="71" />);
    // Only 1 Check in button (for row 101; row 102 is already checked in, row 103 is CANCELLED)
    const buttons = await screen.findAllByRole("button", { name: "Check in" });
    expect(buttons).toHaveLength(1);
    expect(screen.getByText(/Checked in/i)).toBeTruthy();

    // First attempt receives 409 CHECKIN_WINDOW_CLOSED -> shows alert, keeps button enabled
    fireEvent.click(buttons[0]!);
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Check-in has not opened yet");
    expect(fetcher.mock.calls[1]![0]).toBe("/api/v1/organizer/workshops/71/registrations/101/check-in");

    // Second attempt succeeds 200 -> updates row to Checked in and removes button
    fireEvent.click(screen.getByRole("button", { name: "Check in" }));
    expect(await screen.findByText(/Participant checked in/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Check in" })).toBeNull();
    expect(screen.getAllByText(/Checked in/i).length).toBeGreaterThanOrEqual(2);
  });

  it("STS-F08-08: Participant views display Checked in timestamp and disable Cancel registration for checked-in rows", async () => {
    const checkedInReg = {
      registration_id: "201",
      status: "ACTIVE",
      registered_at: "2026-12-10T08:00:00.000000Z",
      cancelled_at: null,
      checked_in_at: "2026-12-15T10:05:00.000000Z",
      workshop: {
        workshop_id: "71",
        title: "F08 Checked-in Workshop",
        starts_at: "2026-12-15T10:00:00.000Z"
      }
    };
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [checkedInReg], pagination: { next_cursor: null } })
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: checkedInReg })
      })
    );

    const { unmount } = render(<ParticipantRegistrationViews />);
    expect(await screen.findByText(/Checked in/i)).toBeTruthy();
    const cancelBtn = screen.getByRole("button", { name: "Cancel registration" }) as HTMLButtonElement;
    expect(cancelBtn.disabled).toBe(true);
    unmount();

    // Detail view (/my-registrations/:id) also displays Checked in and disables Cancel registration
    render(<ParticipantRegistrationViews registrationId="201" />);
    expect(await screen.findByText(/Checked in/i)).toBeTruthy();
    const detailCancelBtn = screen.getByRole("button", { name: "Cancel registration" }) as HTMLButtonElement;
    expect(detailCancelBtn.disabled).toBe(true);
  });

  it("R-01: disables all eligible Check in buttons while one request is pending and submits the second row cleanly after the first settles", async () => {
    const row1 = {
      registration_id: "301",
      participant_id: "21",
      status: "ACTIVE",
      registered_at: "2026-12-10T08:00:00.000000Z",
      cancelled_at: null,
      checked_in_at: null
    };
    const row2 = {
      registration_id: "302",
      participant_id: "22",
      status: "ACTIVE",
      registered_at: "2026-12-10T08:05:00.000000Z",
      cancelled_at: null,
      checked_in_at: null
    };

    let resolveFirst!: (val: unknown) => void;
    const firstPost = new Promise(resolve => { resolveFirst = resolve; });

    const fetcher = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [row1, row2], pagination: { next_cursor: null } })
      })
      .mockImplementationOnce(() => firstPost)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: { ...row2, checked_in_at: "2026-12-15T10:12:00.000000Z" } })
      });
    vi.stubGlobal("fetch", fetcher);

    render(<OrganizerRegistrationRoster workshopId="71" />);
    const buttons = await screen.findAllByRole("button", { name: "Check in" }) as HTMLButtonElement[];
    expect(buttons).toHaveLength(2);
    expect(buttons[0]!.disabled).toBe(false);
    expect(buttons[1]!.disabled).toBe(false);

    // Trigger first row check-in and hold it pending:
    // active row shows progress and BOTH buttons must be disabled so no enabled button silently drops clicks.
    fireEvent.click(buttons[0]!);
    const activePendingBtn = await screen.findByRole("button", { name: "Checking in..." }) as HTMLButtonElement;
    const secondRowBtn = screen.getByRole("button", { name: "Check in" }) as HTMLButtonElement;
    expect(activePendingBtn.disabled).toBe(true);
    expect(secondRowBtn.disabled).toBe(true);

    // Resolve first check-in -> row 1 transitions to Checked in, row 2 re-enables and submits cleanly
    resolveFirst({
      ok: true,
      status: 200,
      json: async () => ({ data: { ...row1, checked_in_at: "2026-12-15T10:10:00.000000Z" } })
    });

    await screen.findByText(/Participant checked in/i);
    const enabledSecond = screen.getByRole("button", { name: "Check in" }) as HTMLButtonElement;
    expect(enabledSecond.disabled).toBe(false);

    fireEvent.click(enabledSecond);
    await vi.waitFor(() => {
      expect(screen.queryByRole("button", { name: /Check in|Checking in/i })).toBeNull();
      expect(screen.getAllByText(/Checked in \(/i)).toHaveLength(2);
    });
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(fetcher.mock.calls[1]![0]).toBe("/api/v1/organizer/workshops/71/registrations/301/check-in");
    expect(fetcher.mock.calls[2]![0]).toBe("/api/v1/organizer/workshops/71/registrations/302/check-in");
  });
});
