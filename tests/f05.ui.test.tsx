// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { OrganizerRegistrationRoster, ParticipantRegistrationViews } from "../web/RegistrationViews.js";
import { ParticipantApp } from "../web/ParticipantApp.js";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const activeReg = {
  registration_id: "601",
  workshop: {
    workshop_id: "41",
    title: "F05 UI Workshop",
    starts_at: "2026-12-10T10:00:00.000Z"
  },
  status: "ACTIVE",
  registered_at: "2026-11-23T10:00:00.000Z",
  cancelled_at: null
};

const cancelledReg = {
  ...activeReg,
  status: "CANCELLED",
  cancelled_at: "2026-11-23T10:30:00.000Z"
};

describe("F-05 Cancellation UI states", () => {
  it("STS-F05-10: Participant list cancels an ACTIVE registration and reloads persisted CANCELLED status with timestamp", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => ({ data: [activeReg], pagination: { next_cursor: null } })
      })
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => ({
          data: {
            registration_id: "601",
            workshop_id: "41",
            status: "CANCELLED",
            registered_at: activeReg.registered_at,
            cancelled_at: cancelledReg.cancelled_at
          }
        })
      })
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => ({ data: [cancelledReg], pagination: { next_cursor: null } })
      });
    vi.stubGlobal("fetch", fetcher);

    render(<ParticipantRegistrationViews />);
    const cancelBtn = await screen.findByRole("button", { name: "Cancel registration" });
    fireEvent.click(cancelBtn);

    expect(await screen.findByText("Registration cancelled · CANCELLED")).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole("button", { name: "Cancel registration" })).toBeNull());
    expect(screen.getByText((_, element) =>
      element?.tagName === "P" && element.textContent?.includes("Status: CANCELLED") === true
    )).toBeTruthy();
    expect(screen.getByText(/Cancelled:/)).toBeTruthy();
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(fetcher.mock.calls[1]![0]).toBe("/api/v1/me/registrations/601/cancel");
    expect((fetcher.mock.calls[1]![1] as RequestInit).method).toBe("POST");
  });

  it("STS-F05-10: displays server conflict message on 409 CANCELLATION_DEADLINE_PASSED without falsely claiming cancellation", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => ({ data: activeReg })
      })
      .mockResolvedValueOnce({
        ok: false, status: 409,
        json: async () => ({
          error: { code: "CANCELLATION_DEADLINE_PASSED", message: "Cancellation deadline has passed" }
        })
      });
    vi.stubGlobal("fetch", fetcher);

    render(<ParticipantRegistrationViews registrationId="601" />);
    fireEvent.click(await screen.findByRole("button", { name: "Cancel registration" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Cancellation deadline has passed");
    expect(screen.queryByText(/Registration cancelled/)).toBeNull();
    expect(screen.getByRole("button", { name: "Cancel registration" })).toBeTruthy();
  });

  it("STS-F05-08: Organizer roster renders cancelled_at for CANCELLED rows while preserving privacy", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({
        data: [{
          registration_id: "601",
          participant_id: "opaque-77",
          status: "CANCELLED",
          registered_at: "2026-11-23T10:00:00.000Z",
          cancelled_at: "2026-11-23T10:30:00.000Z"
        }],
        pagination: { next_cursor: null }
      })
    }));

    render(<OrganizerRegistrationRoster workshopId="41" />);
    expect(await screen.findByText(/opaque-77/)).toBeTruthy();
    expect(screen.getByText(/CANCELLED/)).toBeTruthy();
    expect(screen.getByText(/Cancelled:/)).toBeTruthy();
  });

  it("STS-F05-10: ParticipantApp Refresh workshops clears stale local registeredWorkshopIds so re-registration is enabled", async () => {
    const workshop = {
      id: "41", title: "F05 Re-register Workshop", description: "Desc", location: "Room 41",
      starts_at: "2026-12-10T10:00:00.000Z", ends_at: "2026-12-10T12:00:00.000Z",
      capacity: 1, registration_deadline: null, remaining_seats: 1, registration_open: true
    };
    const summary = {
      id: workshop.id, title: workshop.title, location: workshop.location, starts_at: workshop.starts_at,
      capacity: 1, remaining_seats: 1, registration_open: true
    };
    const fullSummary = { ...summary, remaining_seats: 0, registration_open: false };
    const fullWorkshop = { ...workshop, remaining_seats: 0, registration_open: false };

    const fetcher = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: [summary] }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: workshop }) })
      .mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ data: { id: "r1", workshop_id: "41", status: "ACTIVE", registered_at: "2026-11-23T10:00:00Z" } }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: [fullSummary] }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: fullWorkshop }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: [summary] }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: workshop }) });
    vi.stubGlobal("fetch", fetcher);

    render(<ParticipantApp />);
    fireEvent.click(await screen.findByRole("button", { name: "View details" }));
    fireEvent.click(await screen.findByRole("button", { name: "Register for workshop" }));
    expect(await screen.findByRole("button", { name: "Already registered" })).toBeTruthy();

    // Simulate returning/refreshing after cancelling externally
    fireEvent.click(screen.getByRole("button", { name: "Refresh workshops" }));
    fireEvent.click(await screen.findByRole("button", { name: "View details" }));
    const registerAgainBtn = await screen.findByRole("button", { name: "Register for workshop" }) as HTMLButtonElement;
    expect(registerAgainBtn.disabled).toBe(false);
  });
});
