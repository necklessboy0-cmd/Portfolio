import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { readPrivateDocument } from "@/lib/privateFiles";

export const runtime = "nodejs";

const MIME: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "encrypted-at-rest",
  webp: "image/webp",
};

/**
 * Private documents (certificates, degrees, scans) are stored ENCRYPTED and
 * are only served here, to authenticated sessions. Guessing the URL without a
 * valid session cookie returns 401 — the file is never public.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const user = verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { path: segments } = await ctx.params;
  const filename = segments.join("/");
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(filename) || filename.includes("..")) {
    return NextResponse.json({ error: "Invalid filename." }, { status: 400 });
  }
  const buf = await readPrivateDocument(filename);
  if (!buf) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const ext = (filename.match(/\.([a-z0-9]+)$/i)?.[1] ?? "").toLowerCase();
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": MIME[ext] ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
