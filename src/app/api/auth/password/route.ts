import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_S,
  createSessionToken,
  hashPassword,
  sessionCookieOptions,
  setRuntimePasswordHash,
  verifyAdminPassword,
  verifySessionToken,
} from "@/lib/session";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";

/**
 * Change the administrator password.
 *  • Requires an authenticated session (never callable anonymously).
 *  • Requires the CURRENT password (anti-hijack).
 *  • Stores only the new scrypt hash — .env.local in dev; in production the
 *    response tells the owner to update ADMIN_PASSWORD_HASH in the Vercel
 *    dashboard (serverless filesystems are read-only there).
 *  • New sessions carry the new password-version fingerprint, so every old
 *    session is invalidated the moment the hash changes.
 */
export async function POST(req: NextRequest) {
  if (!verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = (await req.json()) as { currentPassword?: string; newPassword?: string };
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const { currentPassword = "", newPassword = "" } = body;

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Both fields are required." }, { status: 400 });
  }
  if (!(await verifyAdminPassword(currentPassword))) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 403 });
  }
  if (newPassword.length < 10 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    return NextResponse.json(
      { error: "New password must be at least 10 characters with letters and numbers." },
      { status: 422 },
    );
  }

  const encoded = hashPassword(newPassword);
  // Activate immediately — old sessions die now, not after a restart.
  setRuntimePasswordHash(encoded);

  if (process.env.VERCEL) {
    return NextResponse.json({
      ok: true,
      persistent: false,
      message:
        "Password accepted for this session. To persist it, set ADMIN_PASSWORD_HASH in Vercel → Settings → Environment Variables to the value below, then redeploy.",
      hashForVercel: encoded,
    });
  }

  const envPath = path.join(process.cwd(), ".env.local");
  let existing = "";
  try {
    existing = await fs.readFile(envPath, "utf-8");
  } catch {
    /* first run */
  }
  const filtered = existing
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("ADMIN_PASSWORD_HASH="))
    .join("\n");
  await fs.writeFile(envPath, `${filtered ? filtered + "\n" : ""}ADMIN_PASSWORD_HASH=${encoded}\n`, "utf-8");

  const res = NextResponse.json({ ok: true, persistent: true, message: "Password updated and saved." });
  // Fresh cookie bound to the new hash; all other sessions are now dead.
  res.cookies.set(SESSION_COOKIE, createSessionToken(), sessionCookieOptions());
  return res;
}

export { SESSION_MAX_AGE_S };
