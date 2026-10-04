import { createHmac, createHash, randomBytes, scrypt as _scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const scrypt = promisify(_scrypt) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem?: number },
) => Promise<Buffer>;

// ----------------------------------------------------------------------------
// Password-based authentication.
// ----------------------------------------------------------------------------

export const SESSION_COOKIE = "mt_session";
export const SESSION_MAX_AGE_S = 12 * 60 * 60; // 12 hours

const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEY_LEN = 64;

// File-based password path setup
const PASSWORD_FILE_PATH = path.join(process.cwd(), "src", "lib", "admin_password.txt");

/**
 * Helper function to read plain text password from local file
 */
function getPasswordFromFile(): string | null {
  try {
    if (fs.existsSync(PASSWORD_FILE_PATH)) {
      return fs.readFileSync(PASSWORD_FILE_PATH, "utf-8").trim();
    }
  } catch (err) {
    console.error("Error reading admin_password.txt:", err);
  }
  return null;
}

// config.json — the single credential source (no env vars required).
// Holds a salted scrypt `passwordHash` and the `sessionSecret` that signs
// login cookies. Read once and cached for the life of the process.
let cachedConfig: { passwordHash?: string; sessionSecret?: string } | null = null;
function readConfigJson(): { passwordHash?: string; sessionSecret?: string } {
  if (cachedConfig) return cachedConfig;
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), "config.json"), "utf-8");
    cachedConfig = JSON.parse(raw) as { passwordHash?: string; sessionSecret?: string };
  } catch (err) {
    console.error("Failed to read config.json:", err);
    cachedConfig = {};
  }
  return cachedConfig;
}

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
  return getPasswordFromFile() !== null || parsePasswordHash(currentPasswordHash()) !== null || process.env.NODE_ENV !== "production";
}

let runtimePasswordHash: string | null = null;
export function setRuntimePasswordHash(encoded: string): void {
  runtimePasswordHash = encoded;
  // File mein bhi save karne ke liye
  try {
    fs.writeFileSync(PASSWORD_FILE_PATH, encoded.trim(), "utf-8");
  } catch (err) {
    console.error("Failed to update admin_password.txt:", err);
  }
}

function currentPasswordHash(): string | undefined {
  return runtimePasswordHash ?? readConfigJson().passwordHash ?? process.env.ADMIN_PASSWORD_HASH;
}

/** Password verification directly reading from file first, fallback to hashed check */
export async function verifyAdminPassword(password: string): Promise<boolean> {
  // 1. Pehle file se read karo
  const filePassword = getPasswordFromFile();
  if (filePassword) {
    return password === filePassword;
  }

  // 2. Fallback to hash verification if no file exists
  const stored = parsePasswordHash(currentPasswordHash());
  if (!stored) {
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
  const filePassword = getPasswordFromFile();
  const raw = filePassword || currentPasswordHash() || "dev-admin";
  return createHash("sha256").update(raw).digest("hex").slice(0, 16);
}

// ------------------------------ sessions ------------------------------------

type SessionPayload = { v: 1; iat: number; exp: number; pv: string };

function signingKey(): string {
  return readConfigJson().sessionSecret ?? process.env.ADMIN_SESSION_SECRET ?? "freebuff-local-dev-secret";
}

export function sessionsConfigured(): boolean {
  return Boolean(readConfigJson().sessionSecret) || Boolean(process.env.ADMIN_SESSION_SECRET) || process.env.NODE_ENV !== "production";
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

export const OWNER_ROLE = "owner" as const;
