// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { OrganizerApp } from "../web/OrganizerApp.js";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const publishedWorkshop = {
  id: "81",
  owner_user_id: "3",
  title: "F07 Editable Workshop",
  description: "Published workshop description",
  location: "Room 701",
  starts_at: "2026-12-20T10:00:00.000Z",
  ends_at: "2026-12-20T12:00:00.000Z",
  capacity: 5,
  status: "PUBLISHED" as const,
  registration_deadline: "2026-12-19T18:00:00.000Z",
  registration_closed: false,
  active_registrations_count: 2,
  created_at: "2026-11-23T08:00:00.000Z"
};

describe("F-07 Published Workshop Editing UI states", () => {
  it("STS-F07-10: Organizer opens Edit workshop from My Workshops, sees active count, displays 409 CAPACITY_BELOW_ACTIVE alert, and saves valid edit", async () => {
    const updatedWorkshop = {
      ...publishedWorkshop,
      location: "Room 702 Updated",
      capacity: 8
    };
    const fetcher = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: [publishedWorkshop] }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: publishedWorkshop }) })
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ error: { code: "CAPACITY_BELOW_ACTIVE", message: "Capacity cannot be reduced below current active registrations" } })
      })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: updatedWorkshop }) });
    vi.stubGlobal("fetch", fetcher);

    render(<OrganizerApp />);
    const editBtn = await screen.findByRole("button", { name: "Edit workshop" });
    fireEvent.click(editBtn);

    // Displays active registrations count and schedule lock guidance when active_registrations_count > 0
    expect(await screen.findByText(/Active Registrations:/i)).toBeTruthy();
    expect(screen.getByText(/2 \/ 5/)).toBeTruthy();
    expect(screen.getByText(/Schedule is locked/i)).toBeTruthy();

    // Attempt reducing capacity below active count -> 409 CAPACITY_BELOW_ACTIVE alert
    const capInput = screen.getByLabelText(/^Capacity/i) as HTMLInputElement;
    fireEvent.change(capInput, { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Published Changes" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Capacity cannot be reduced below current active registrations");
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(fetcher.mock.calls[2]![0]).toBe("/api/v1/organizer/workshops/81");
    expect((fetcher.mock.calls[2]![1] as RequestInit).method).toBe("PATCH");

    // Correct to valid location and increased capacity -> saves cleanly
    const locInput = screen.getByLabelText(/^Location/i) as HTMLInputElement;
    fireEvent.change(locInput, { target: { value: "Room 702 Updated" } });
    fireEvent.change(capInput, { target: { value: "8" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Published Changes" }));

    expect(await screen.findByText("Published workshop updated")).toBeTruthy();
    expect(await screen.findByText("Room 702 Updated")).toBeTruthy();
    expect(screen.getByText(/2 \/ 8/)).toBeTruthy();
  });

  it("STS-F07-10: validates badInput / invalid nonempty deadline in published edit form without sending PATCH", async () => {
    const unlockedWorkshop = { ...publishedWorkshop, active_registrations_count: 0 };
    const fetcher = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: [unlockedWorkshop] }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: unlockedWorkshop }) });
    vi.stubGlobal("fetch", fetcher);

    render(<OrganizerApp />);
    fireEvent.click(await screen.findByRole("button", { name: "Edit workshop" }));

    const deadlineInput = await screen.findByLabelText(/Registration Deadline/i) as HTMLInputElement;
    deadlineInput.setAttribute("type", "text");
    deadlineInput.value = "2026-02-30T10:00";
    fireEvent.click(screen.getByRole("button", { name: "Save Published Changes" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("valid");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
