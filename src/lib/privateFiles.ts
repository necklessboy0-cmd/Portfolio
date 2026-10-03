import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { promises as fs } from "fs";
import path from "path";

const GH_TOKEN_HEADERS = () => ({
  Authorization: `Bearer ${process.env.GITHUB_TOKEN || ""}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
});

async function ghFetchJson(url: string, init: RequestInit): Promise<Response> {
  return fetch(url, { ...init, headers: { ...GH_TOKEN_HEADERS(), ...(init.headers ?? {}) } });
}

// ----------------------------------------------------------------------------
// Private document store (uploaded certificates, degrees, scans).
//  • Files are AES-256-GCM ENCRYPTED at rest — never served as raw files.
//  • Dev  → .private-uploads/ locally (gitignored).
//  • Prod → the encrypted blob is committed under private/documents/ in the
//    repo; only the running app (holding PRIVATE_DOCS_KEY) can decrypt it,
//    and it is only streamed to authenticated, authorized sessions via
//    /api/files/[...path].
// ----------------------------------------------------------------------------

const LOCAL_DIR = path.join(process.cwd(), ".private-uploads");
const GH_DIR = "private/documents";

type EncBlob = { iv: string; data: string }; // data = base64(ciphertext || tag)

function keyBytes(): Buffer | null {
  const k = process.env.PRIVATE_DOCS_KEY || process.env.ADMIN_SESSION_SECRET || "";
  if (!k) return null;
  return createHash("sha256").update(k).digest();
}

export function privateDocsConfigured(): boolean {
  return keyBytes() !== null;
}

function encrypt(buf: Buffer): EncBlob {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyBytes()!, iv);
  const enc = Buffer.concat([cipher.update(buf), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { iv: iv.toString("hex"), data: Buffer.concat([enc, tag]).toString("base64") };
}

function decrypt(blob: EncBlob): Buffer {
  const raw = Buffer.from(blob.data, "base64");
  const tag = raw.subarray(raw.length - 16);
  const ciphertext = raw.subarray(0, raw.length - 16);
  const decipher = createDecipheriv("aes-256-gcm", keyBytes()!, Buffer.from(blob.iv, "hex"));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

const ghApi = (p: string) => `https://api.github.com${p}`;

/** Store a document encrypted. Returns the storage path used. */
export async function storePrivateDocument(
  filename: string,
  buf: Buffer,
): Promise<{ mode: "local" | "github"; path: string }> {
  const blob = JSON.stringify(encrypt(buf));
  const ghPath = `${GH_DIR}/${filename}.enc.json`;

  if (process.env.VERCEL) {
    const token = process.env.GITHUB_TOKEN || "";
    const [owner, ...rest] = (process.env.GITHUB_REPO || "necklessboy0-cmd/Portfolio").split("/");
    const repo = rest.join("/") || "Portfolio";
    const branch = process.env.GITHUB_BRANCH || "Portfolio";
    if (!token) throw new Error("GITHUB_TOKEN not configured");
    const headRes = await ghFetchJson(
      ghApi(`/repos/${owner}/${repo}/contents/${ghPath}?ref=${encodeURIComponent(branch)}`),
      { method: "GET" },
    );
    let sha: string | undefined;
    if (headRes.ok) {
      const head = (await headRes.json()) as { sha?: string };
      sha = head.sha;
    }
    const putRes = await ghFetchJson(ghApi(`/repos/${owner}/${repo}/contents/${ghPath}`), {
      method: "PUT",
      body: JSON.stringify({
        message: `admin: store document ${filename}`,
        content: Buffer.from(blob, "utf-8").toString("base64"),
        branch,
        ...(sha ? { sha } : {}),
      }),
    });
    if (!putRes.ok) {
      const errText = await putRes.text().catch(() => "");
      throw new Error(`GitHub store failed (${putRes.status}) ${errText.slice(0, 160)}`);
    }
    return { mode: "github", path: ghPath };
  }

  await fs.mkdir(LOCAL_DIR, { recursive: true });
  await fs.writeFile(path.join(LOCAL_DIR, `${filename}.enc.json`), blob, "utf-8");
  return { mode: "local", path: `${LOCAL_DIR}/${filename}.enc.json` };
}

/** Read + decrypt a stored document. Returns null when not found. */
export async function readPrivateDocument(filename: string): Promise<Buffer | null> {
  if (process.env.VERCEL) {
    const token = process.env.GITHUB_TOKEN || "";
    const [owner, ...rest] = (process.env.GITHUB_REPO || "necklessboy0-cmd/Portfolio").split("/");
    const repo = rest.join("/") || "Portfolio";
    const branch = process.env.GITHUB_BRANCH || "Portfolio";
    if (!token) return null;
    const res = await ghFetchJson(
      ghApi(`/repos/${owner}/${repo}/contents/${GH_DIR}/${filename}.enc.json?ref=${encodeURIComponent(branch)}`),
      { method: "GET", headers: { Accept: "application/vnd.github.raw+json" } },
    );
    if (!res.ok) return null;
    try {
      const blob = JSON.parse(await res.text()) as EncBlob;
      return decrypt(blob);
    } catch {
      return null;
    }
  }
  try {
    const raw = await fs.readFile(path.join(LOCAL_DIR, `${filename}.enc.json`), "utf-8");
    return decrypt(JSON.parse(raw) as EncBlob);
  } catch {
    return null;
  }
}

/** Sanitize a user-supplied filename to a safe slug with its extension. */
export function safeDocName(original: string, fallback = "document"): string {
  const ext = (original.match(/\.([a-z0-9]{2,5})$/i)?.[1] ?? "bin").toLowerCase();
  const base = original
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48) || fallback;
  return `${base}-${randomBytes(4).toString("hex")}.${ext}`;
}
