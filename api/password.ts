import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEY_LENGTH) as Buffer;
  return "scrypt$" + salt.toString("hex") + "$" + key.toString("hex");
}
const dummySalt = Buffer.from("86c4987380f8591f89a652349819738d", "hex");
export const DUMMY_HASH = "scrypt$" + dummySalt.toString("hex") + "$" + Buffer.alloc(KEY_LENGTH, 0).toString("hex");
export async function verifyPassword(password: string, encodedHash: string): Promise<boolean> {
  const parts = encodedHash.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt" ||
    !/^[\da-f]{32}$/i.test(parts[1] ?? "") ||
    !/^[\da-f]{128}$/i.test(parts[2] ?? "")) return false;
  const actual = await scrypt(password, Buffer.from(parts[1]!, "hex"), KEY_LENGTH) as Buffer;
  return timingSafeEqual(actual, Buffer.from(parts[2]!, "hex"));
}
