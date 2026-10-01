import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/adminAuth";
import { commitRepoFile, triggerDeployHook } from "@/lib/resumeStore";

export const runtime = "nodejs";

const ALLOWED = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

const EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/**
 * Upload a document (certificate PDF, scan, image).
 *  • Dev  → writes into public/uploads (served directly by Next).
 *  • Prod → commits it to the repo's public/uploads via the GitHub API;
 *           the URL becomes live after the automatic redeploy.
 */
export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!verifySessionToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: "Only PDF, PNG, JPG or WEBP files are allowed." },
      { status: 415 },
    );
  }
  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "Max file size is 8 MB." }, { status: 413 });
  }

  const ext = EXT[file.type] ?? "bin";
  const base = (form.get("name") as string | null) || "document";
  const slug =
    base
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 48) || "document";
  const filename = `${slug}-${Date.now().toString(36)}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());

  if (process.env.VERCEL) {
    const gh = await commitRepoFile(
      `public/uploads/${filename}`,
      buf.toString("base64"),
      `upload ${filename}`,
    );
    if (!gh.ok) {
      return NextResponse.json(
        { error: gh.error ?? "Could not store the file." },
        { status: 502 },
      );
    }
    await triggerDeployHook();
    return NextResponse.json({
      mode: "github",
      filename,
      url: `/uploads/${filename}`,
    });
  }

  const dir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, filename), buf);
  return NextResponse.json({
    mode: "local",
    filename,
    url: `/uploads/${filename}`,
  });
}
