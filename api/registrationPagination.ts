export type RegistrationCursor = { registeredAt: string; id: string };
export type RegistrationPagination = { limit: number; cursor: RegistrationCursor | null };

function validId(value: string): boolean {
  if (!/^[1-9]\d{0,18}$/.test(value)) return false;
  return BigInt(value) <= 9223372036854775807n;
}

function validUtcTimestamp(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?Z$/.exec(value);
  if (!match) return false;
  const [, year, month, day, hour, minute, second, fraction] = match;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() + 1 === Number(month) &&
    date.getUTCDate() === Number(day) &&
    date.getUTCHours() === Number(hour) &&
    date.getUTCMinutes() === Number(minute) &&
    date.getUTCSeconds() === Number(second) &&
    date.getUTCMilliseconds() === Number((fraction ?? "").slice(0, 3).padEnd(3, "0"));
}

export function parseRegistrationPagination(query: {
  limit?: unknown;
  cursor?: unknown;
}): RegistrationPagination | null {
  const rawLimit = query.limit;
  let limit = 20;
  if (rawLimit !== undefined) {
    if (typeof rawLimit !== "string" || !/^[1-9]\d*$/.test(rawLimit)) return null;
    limit = Number(rawLimit);
    if (!Number.isSafeInteger(limit) || limit > 50) return null;
  }

  const rawCursor = query.cursor;
  if (rawCursor === undefined) return { limit, cursor: null };
  if (typeof rawCursor !== "string" || rawCursor.length > 512 ||
      !/^[A-Za-z0-9_-]+$/.test(rawCursor)) return null;
  try {
    const decoded = Buffer.from(rawCursor, "base64url");
    if (decoded.toString("base64url") !== rawCursor) return null;
    const value: unknown = JSON.parse(decoded.toString("utf8"));
    if (!value || typeof value !== "object" || !("registeredAt" in value) ||
        !("id" in value) || typeof value.registeredAt !== "string" ||
        typeof value.id !== "string" || !validId(value.id) ||
        !validUtcTimestamp(value.registeredAt)) return null;
    return { limit, cursor: { registeredAt: value.registeredAt, id: value.id } };
  } catch {
    return null;
  }
}

export function encodeRegistrationCursor(row: { registered_at: string; id: string }): string {
  return Buffer.from(JSON.stringify({
    registeredAt: row.registered_at,
    id: String(row.id)
  })).toString("base64url");
}
