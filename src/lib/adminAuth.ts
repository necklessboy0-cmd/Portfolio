import { createHmac, randomUUID, timingSafeEqual } from "crypto";

// ----------------------------------------------------------------------------
// Private admin authentication.
//  • Password → ADMIN_PASSWORD env var (dev fallback: "admin" when unset).
//  • Session  → HMAC-signed token, HttpOnly cookie, 12h expiry.
//  • Brute-force throttle: 5 failed attempts / 10 min / IP (in-memory).
// ----------------------------------------------------------------------------

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function sessionSecret(): string {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "freebuff-dev-secret";
}

export function adminPassword(): string {
  // Fail closed in production: without an explicit ADMIN_PASSWORD, login is
  // disabled entirely. Local dev falls back to "admin" for convenience.
  const pw = process.env.ADMIN_PASSWORD;
  if (pw) return pw;
  return process.env.NODE_ENV === "production" ? "" : "admin";
}

export function createSessionToken(): string {
  const id = randomUUID();
  const exp = Date.now() + SESSION_TTL_MS;
  const payload = `${id}.${exp}`;
  const sig = createHmac("sha256", sessionSecret()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [id, exp, sig] = parts;
  const expNum = Number(exp);
  if (!Number.isFinite(expNum) || expNum < Date.now()) return false;
  const expected = createHmac("sha256", sessionSecret()).update(`${id}.${exp}`).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// ------------------------- brute-force throttling ----------------------------

type Attempt = { count: number; firstAt: number };
const attempts = new Map<string, Attempt>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export function isThrottled(ip: string): boolean {
  const a = attempts.get(ip);
  if (!a) return false;
  if (Date.now() - a.firstAt > WINDOW_MS) {
    attempts.delete(ip);
    return false;
  }
  return a.count >= MAX_ATTEMPTS;
}

export function recordFailure(ip: string): void {
  const a = attempts.get(ip);
  if (!a || Date.now() - a.firstAt > WINDOW_MS) {
    attempts.set(ip, { count: 1, firstAt: Date.now() });
    return;
  }
  a.count += 1;
}

export function clearFailures(ip: string): void {
  attempts.delete(ip);
}

export const SESSION_COOKIE = "mt_admin_session";
export const SESSION_MAX_AGE_S = SESSION_TTL_MS / 1000;
