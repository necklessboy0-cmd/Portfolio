import { createHmac, createHash, randomBytes, scrypt as _scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scrypt = promisify(_scrypt) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem?: number },
) => Promise<Buffer>;

// ----------------------------------------------------------------------------
// Password-based authentication.
//  • The ONLY credential is the administrator password. It is never stored in
//    source: the owner sets ADMIN_PASSWORD_HASH (scrypt, via `npm run
//    set-password` which writes the gitignored .env.local) or the equivalent
//    Vercel environment variable in production.
//  • Sessions are HMAC-SHA256-signed, HttpOnly cookies (12h). The token binds
//    to a fingerprint of the password hash, so changing the password
//    immediately invalidates every existing session.
//  • No signup, no Google OAuth, no public registration anywhere.
// ----------------------------------------------------------------------------

export const SESSION_COOKIE = "mt_session";
export const SESSION_MAX_AGE_S = 12 * 60 * 60; // 12 hours

const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEY_LEN = 64;

// ------------------------------ password ------------------------------------

export type PasswordHash = { format: "scrypt"; N: number; r: number; p: number; salt: Buffer; hash: Buffer };

/**
 * Parse the stored hash. Canonical format (dotenv-expand safe — no `$`):
 *   scrypt:N:r:p:<salt_b64>:<hash_b64>
 * Legacy `$`-separated format also accepted.
 */
export function parsePasswordHash(raw: string | undefined): PasswordHash | null {
  if (!raw) return null;
  const sep = raw.trim().includes(":") ? ":" : "$";
  const parts = raw.trim().split(sep);
  if (parts.length !== 6 || parts[0] !== "scrypt") return null;
  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) return null;
  try {
    const salt = Buffer.from(parts[4], "base64");
    const hash = Buffer.from(parts[5], "base64");
    if (!salt.length || !hash.length) return null;
    return { format: "scrypt", N, r, p, salt, hash };
  } catch {
    return null;
  }
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSyncLocal(password, salt, KEY_LEN);
  return `scrypt:${SCRYPT.N}:${SCRYPT.r}:${SCRYPT.p}:${salt.toString("base64")}:${hash.toString("base64")}`;
}

function scryptSyncLocal(password: string, salt: Buffer, keylen: number): Buffer {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { scryptSync } = require("crypto") as typeof import("crypto");
  return scryptSync(password, salt, keylen, SCRYPT);
}

export function adminPasswordConfigured(): boolean {
  return parsePasswordHash(currentPasswordHash()) !== null || process.env.NODE_ENV !== "production";
}

/**
 * Runtime override for the stored hash. `next start` reads .env.local once at
 * boot; after an in-app password change we set this so the new hash takes
 * effect IMMEDIATELY (old sessions die instantly) without waiting for a
 * process restart. Persistence still comes from the env file/Vercel secret.
 */
let runtimePasswordHash: string | null = null;
export function setRuntimePasswordHash(encoded: string): void {
  runtimePasswordHash = encoded;
}
function currentPasswordHash(): string | undefined {
  return runtimePasswordHash ?? process.env.ADMIN_PASSWORD_HASH;
}

/** Constant-time password verification against the stored scrypt hash. */
export async function verifyAdminPassword(password: string): Promise<boolean> {
  const stored = parsePasswordHash(currentPasswordHash());
  if (!stored) {
    // Dev convenience ONLY (never in production): unset hash accepts "admin".
    if (process.env.NODE_ENV !== "production" && password === "admin") return true;
    return false;
  }
  try {
    const derived = await scrypt(password, stored.salt, stored.hash.length, {
      N: stored.N,
      r: stored.r,
      p: stored.p,
      maxmem: SCRYPT.maxmem,
    });
    return derived.length === stored.hash.length && timingSafeEqual(derived, stored.hash);
  } catch {
    return false;
  }
}

/** Short fingerprint of the current password hash — baked into session tokens. */
function passwordVersion(): string {
  const raw = currentPasswordHash() || "dev-admin";
  return createHash("sha256").update(raw).digest("hex").slice(0, 16);
}

// ------------------------------ sessions ------------------------------------

type SessionPayload = { v: 1; iat: number; exp: number; pv: string };

function signingKey(): string {
  return process.env.ADMIN_SESSION_SECRET || "freebuff-local-dev-secret";
}

/** Fail closed in production without a signing secret; dev gets a local fallback. */
export function sessionsConfigured(): boolean {
  return Boolean(process.env.ADMIN_SESSION_SECRET) || process.env.NODE_ENV !== "production";
}

export function createSessionToken(now = Date.now()): string {
  const payload: SessionPayload = {
    v: 1,
    iat: now,
    exp: now + SESSION_MAX_AGE_S * 1000,
    pv: passwordVersion(),
  };
  const body = Buffer.from(JSON.stringify(payload), "utf-8").toString("base64url");
  const sig = createHmac("sha256", signingKey()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return false;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  let expected: Buffer;
  let given: Buffer;
  try {
    expected = createHmac("sha256", signingKey()).update(body).digest();
    given = Buffer.from(sig, "base64url");
  } catch {
    return false;
  }
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf-8")) as SessionPayload;
    if (payload.v !== 1) return false;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return false;
    // Bound sessions to the current password: a password change kills them all.
    if (payload.pv !== passwordVersion()) return false;
    return true;
  } catch {
    return false;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_S,
  };
}

/** The session grants ONE owner role — there is a single shared credential. */
export const OWNER_ROLE = "owner" as const;
