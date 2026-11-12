// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { OrganizerRegistrationRoster, ParticipantRegistrationViews } from "../web/RegistrationViews.js";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const registration = {
  registration_id: "501",
  workshop: {
    workshop_id: "41",
    title: "F04 Workshop",
    starts_at: "2026-12-01T10:00:00.000Z"
  },
  status: "ACTIVE",
  registered_at: "2026-11-01T10:00:00.000Z"
};

describe("F-04 Participant registration UI", () => {
  it("STS-F04-07: shows loading followed by the safe empty state", async () => {
    let resolveFetch!: (value: unknown) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise(resolve => { resolveFetch = resolve; })));
    render(<ParticipantRegistrationViews />);
    expect(screen.getByRole("status").textContent).toContain("Loading registrations");
    resolveFetch({ ok: true, status: 200, json: async () => ({ data: [], pagination: { next_cursor: null } }) });
    expect(await screen.findByText("You do not have any registrations yet.")).toBeTruthy();
  });

  it("STS-F04-07: displays a session-expired state for a 401 detail response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    render(<ParticipantRegistrationViews registrationId="501" />);
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("session has expired");
    expect(alert.getAttribute("data-error-kind")).toBe("expired");
  });

  it("STS-F04-07: displays an unavailable state for a private 404 detail response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    render(<ParticipantRegistrationViews registrationId="999" />);
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("unavailable");
    expect(alert.getAttribute("data-error-kind")).toBe("unavailable");
    expect(alert.textContent).not.toContain("999");
  });

  it("shows own registration data and appends the next cursor page", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => ({ data: [registration], pagination: { next_cursor: "opaque-cursor" } })
      })
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => ({ data: [{ ...registration, registration_id: "502" }], pagination: { next_cursor: null } })
      });
    vi.stubGlobal("fetch", fetcher);
    render(<ParticipantRegistrationViews />);
    expect(await screen.findByText("F04 Workshop")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Load more registrations" }));
    await waitFor(() => expect(screen.getAllByRole("link", { name: "View registration" })).toHaveLength(2));
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[1]![0]).toContain("cursor=opaque-cursor");
  });

  it("shows a safe general error when the list request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("private network detail")));
    render(<ParticipantRegistrationViews />);
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Unable to load registration information");
    expect(alert.textContent).not.toContain("private network detail");
  });

  it("shows the safe empty state for an Organizer roster with no registrations", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ data: [], pagination: { next_cursor: null } })
    }));
    render(<OrganizerRegistrationRoster workshopId="41" />);
    expect(await screen.findByText("No registrations for this workshop yet.")).toBeTruthy();
  });

  it("clears previously loaded Participant rows when a later page returns 401", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => ({ data: [registration], pagination: { next_cursor: "opaque-cursor" } })
      })
      .mockResolvedValueOnce({ ok: false, status: 401 });
    vi.stubGlobal("fetch", fetcher);
    render(<ParticipantRegistrationViews />);
    expect(await screen.findByText("F04 Workshop")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Load more registrations" }));
    expect((await screen.findByRole("alert")).textContent).toContain("session has expired");
    expect(screen.queryByText("F04 Workshop")).toBeNull();
    expect(screen.queryByRole("button", { name: "Load more registrations" })).toBeNull();
  });
});

describe("F-04 Organizer roster UI", () => {
  it("STS-F04-07: displays a forbidden state for a wrong-role response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403 }));
    render(<OrganizerRegistrationRoster workshopId="41" />);
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("do not have permission");
    expect(alert.getAttribute("data-error-kind")).toBe("forbidden");
  });

  it("STS-F04-07: displays an unavailable state for a foreign or unpublished Workshop", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    render(<OrganizerRegistrationRoster workshopId="41" />);
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("workshop roster is unavailable");
    expect(alert.getAttribute("data-error-kind")).toBe("unavailable");
  });

  it("renders the minimized roster DTO without Participant contact details", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({
        data: [{
          registration_id: "601", participant_id: "17", status: "ACTIVE",
          registered_at: "2026-11-01T10:00:00.000Z"
        }],
        pagination: { next_cursor: null }
      })
    }));
    render(<OrganizerRegistrationRoster workshopId="41" />);
    expect(await screen.findByText("601")).toBeTruthy();
    expect(screen.getByText("17")).toBeTruthy();
    expect(screen.getByText("ACTIVE")).toBeTruthy();
  });

  it("clears previously loaded roster rows when a later page is forbidden", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => ({
          data: [{
            registration_id: "601", participant_id: "17", status: "ACTIVE",
            registered_at: "2026-11-01T10:00:00.000Z"
          }],
          pagination: { next_cursor: "opaque-cursor" }
        })
      })
      .mockResolvedValueOnce({ ok: false, status: 403 });
    vi.stubGlobal("fetch", fetcher);
    render(<OrganizerRegistrationRoster workshopId="41" />);
    expect(await screen.findByText("601", { exact: true })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Load more registrations" }));
    expect((await screen.findByRole("alert")).textContent).toContain("do not have permission");
    expect(screen.queryByText("601", { exact: true })).toBeNull();
  });
});
