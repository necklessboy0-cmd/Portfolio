import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, sessionsConfigured, verifySessionToken } from "@/lib/session";

export const runtime = "nodejs";

/** Who am I? Returns authentication status only — never issues sessions. */
export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const authenticated = sessionsConfigured() && verifySessionToken(token);
  return NextResponse.json(
    { authenticated },
    { headers: { "Cache-Control": "no-store" } },
  );
}
