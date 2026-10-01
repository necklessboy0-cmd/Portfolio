import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { storePrivateDocument, safeDocName } from "@/lib/privateFiles";

export const runtime = "nodejs";

const ALLOWED = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);

/**
 * Upload a document (certificate PDF, scan, image).
 *  • Requires an authenticated admin session.
 *  • The file is stored AES-256-GCM ENCRYPTED — dev: .private-uploads/
 *    (gitignored); prod: private/documents/ in the repo via the GitHub API.
 *  • The returned URL (/api/files/<name>) is NOT public: it streams the
 *    decrypted bytes only to authenticated sessions.
 */
export async function POST(req: NextRequest) {
  if (!verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Only PDF, PNG, JPG or WEBP files are allowed." }, { status: 415 });
  }
  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "Max file size is 8 MB." }, { status: 413 });
  }

  const base = (form.get("name") as string | null) || file.name || "document";
  const filename = safeDocName(base);
  const buf = Buffer.from(await file.arrayBuffer());

  try {
    const stored = await storePrivateDocument(filename, buf);
    return NextResponse.json({
      mode: stored.mode,
      filename,
      url: `/api/files/${filename}`,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not store the file." },
      { status: 502 },
    );
  }
}
