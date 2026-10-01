import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, sessionsConfigured, verifySessionToken } from "@/lib/session";

export const runtime = "nodejs";

/** Backwards-compatible session probe for the admin page. */
export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const authenticated = sessionsConfigured() && verifySessionToken(token);
  return NextResponse.json(
    { authenticated },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * Login POST lives at /api/auth/login — proxy here for the existing admin UI,
 * so the login form can keep posting to /api/admin/session.
 */
export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "local";
  const { isThrottled, recordFailure, clearFailures } = await import("@/lib/authThrottle");
  const { verifyAdminPassword, createSessionToken, sessionCookieOptions } = await import("@/lib/session");

  if (isThrottled(ip)) {
    return NextResponse.json({ error: "Too many failed attempts. Try again in 10 minutes." }, { status: 429 });
  }
  let password = "";
  try {
    const body = (await req.json()) as { password?: string };
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  if (!password) return NextResponse.json({ error: "Password is required." }, { status: 400 });

  if (!(await verifyAdminPassword(password))) {
    recordFailure(ip);
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }
  clearFailures(ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, createSessionToken(), sessionCookieOptions());
  return res;
}

export async function DELETE() {
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
