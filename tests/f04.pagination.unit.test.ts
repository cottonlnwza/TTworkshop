import { describe, expect, it } from "vitest";
import {
  encodeRegistrationCursor,
  parseRegistrationPagination
} from "../api/registrationPagination.js";

describe("F-04 pagination unit behavior", () => {
  it("defaults to 20 rows with no cursor", () => {
    expect(parseRegistrationPagination({})).toEqual({ limit: 20, cursor: null });
  });

  it("accepts the maximum page size of 50", () => {
    expect(parseRegistrationPagination({ limit: "50" })).toEqual({ limit: 50, cursor: null });
  });

  it.each(["0", "51", "-1", "1.5", "01", "9007199254740992"])(
    "rejects invalid page size %s",
    limit => expect(parseRegistrationPagination({ limit })).toBeNull()
  );

  it("encodes and decodes a stable cursor without losing microsecond precision", () => {
    const row = { id: "9223372036854775807", registered_at: "2026-11-01T10:20:30.123456Z" };
    const cursor = encodeRegistrationCursor(row);
    expect(cursor).not.toContain("registeredAt");
    expect(parseRegistrationPagination({ cursor })).toEqual({
      limit: 20,
      cursor: { id: row.id, registeredAt: row.registered_at }
    });
  });

  it.each([
    "not-a-cursor",
    "",
    "eyJyZWdpc3RlcmVkQXQiOiIyMDI2LTAyLTMxVDAwOjAwOjAwLjAwMDAwMFoiLCJpZCI6IjEifQ",
    Buffer.from(JSON.stringify({
      registeredAt: "2026-11-01T00:00:00.000000Z",
      id: "9223372036854775808"
    })).toString("base64url")
  ])("rejects malformed, invalid-date or out-of-range cursor %s", cursor => {
    expect(parseRegistrationPagination({ cursor })).toBeNull();
  });

  it("rejects repeated query parameters rather than choosing one", () => {
    expect(parseRegistrationPagination({ limit: ["20", "50"] })).toBeNull();
    expect(parseRegistrationPagination({ cursor: ["first", "second"] })).toBeNull();
  });
});
