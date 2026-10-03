import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
  verifyAdminPassword,
} from "@/lib/session";
import { isThrottled, recordFailure, clearFailures } from "@/lib/authThrottle";

export const runtime = "nodejs";

/**
 * Password login. No signup exists — the single administrator credential is
 * verified server-side against the stored scrypt hash (env/secret).
 */
export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "local";
  if (isThrottled(ip)) {
    return NextResponse.json(
      { error: "Too many failed attempts. Try again in 10 minutes." },
      { status: 429 },
    );
  }

  let password = "";
  try {
    const body = (await req.json()) as { password?: string };
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  if (!password) {
    return NextResponse.json({ error: "Password is required." }, { status: 400 });
  }

  const ok = await verifyAdminPassword(password);
  if (!ok) {
    recordFailure(ip);
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }
  clearFailures(ip);

  const token = createSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}

export function GET() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}

export function DELETE() {
  // Logout — overwrite the cookie with an expired one.
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}

