import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { extractDocument, analyzeDocument } from "@/lib/docAnalyzer";
import { storePrivateDocument, safeDocName } from "@/lib/privateFiles";
import { readResumeData } from "@/lib/resumeStore";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * AI-powered document analysis (authorized, content-editing roles only).
 * Upload a certificate/degree/qualification and this endpoint:
 *  1. stores it ENCRYPTED (private — never publicly downloadable),
 *  2. extracts its text (PDF layer, DOCX, or OCR for scans),
 *  3. analyzes it: type, title, issuer, recipient, date, skills,
 *     suggested CV section / heading / description.
 * Nothing is applied to the CV or website until the owner confirms in the UI.
 */
export async function POST(req: NextRequest) {
  const user = verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
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
  const allowed = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);
  const name = file.name || "document";
  const isDocx = name.toLowerCase().endsWith(".docx");
  if (!allowed.has(file.type) && !isDocx) {
    return NextResponse.json({ error: "Only PDF, DOCX, PNG, JPG or WEBP files are allowed." }, { status: 415 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Max file size is 10 MB." }, { status: 413 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const storedName = safeDocName(name);

  let stored: { mode: string; path: string };
  try {
    stored = await storePrivateDocument(storedName, buf);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not store the document." },
      { status: 502 },
    );
  }

  const extracted = await extractDocument(name, file.type, buf);
  const { data } = await readResumeData();
  const { analysis, error } = analyzeDocument(extracted, name, data);

  return NextResponse.json({
    ok: Boolean(analysis),
    file: { name: storedName, url: `/api/files/${storedName}`, storedVia: stored.mode },
    analysis,
    error,
  });
}
