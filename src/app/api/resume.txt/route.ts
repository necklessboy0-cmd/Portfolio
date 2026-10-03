import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { readResumeData } from "@/lib/resumeStore";
import { buildCvText } from "@/lib/cv";

export const runtime = "nodejs";

/** Auth-gated ATS plain-text CV (same protection as the PDF endpoint). */
export async function GET(req: NextRequest) {
  if (!verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value)) {
    return NextResponse.json({ error: "Login required to download the CV." }, { status: 401 });
  }
  const { data } = await readResumeData();
  return new Response(buildCvText(data), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": 'attachment; filename=Muhammad-Taswaib-CV.txt',
      "Cache-Control": "private, no-store",
    },
  });
}
