import { promises as fs } from "fs";
import path from "path";
import type { ResumeData } from "@/data/resume";
import { resumeData as fallbackData } from "@/data/resume";

// ----------------------------------------------------------------------------
// Resume data store.
//  • Dev / local  → reads & writes src/data/resume-data.json directly.
//  • Production   → reads the baked-in copy; writes go to GitHub via the
//                   Contents API, which triggers an automatic Vercel
//                   redeploy — so every confirmed admin change goes live.
// ----------------------------------------------------------------------------

const DATA_PATH = path.join(process.cwd(), "src", "data", "resume-data.json");

export type StoreSource = "local-file" | "bundled" | "github";

export async function readResumeData(): Promise<{ data: ResumeData; source: StoreSource }> {
  // On Vercel the filesystem is read-only/lambda-scoped — use the bundled copy.
  if (process.env.VERCEL) {
    return { data: fallbackData, source: "bundled" };
  }
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8");
    return { data: JSON.parse(raw) as ResumeData, source: "local-file" };
  } catch {
    return { data: fallbackData, source: "bundled" };
  }
}

export async function writeResumeDataLocal(data: ResumeData): Promise<void> {
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

// --------------------------- GitHub persistence ------------------------------

function ghConfig() {
  const token = process.env.GITHUB_TOKEN || "";
  const ownerRepo = (process.env.GITHUB_REPO || "necklessboy0-cmd/Portfolio").split("/");
  const owner = ownerRepo[0];
  const repo = ownerRepo.slice(1).join("/") || "Portfolio";
  const branch = process.env.GITHUB_BRANCH || "Portfolio";
  const filePath = "src/data/resume-data.json";
  return { token, owner, repo, branch, filePath };
}

const ghApi = (p: string) => `https://api.github.com${p}`;

async function ghFetch(url: string, init: RequestInit): Promise<Response> {
  const { token } = ghConfig();
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.headers ?? {}),
    },
  });
}

/**
 * Commit the new data to GitHub. Returns the commit URL, or null when GitHub
 * persistence isn't configured (local dev already wrote the file instead).
 */
export async function commitResumeData(
  data: ResumeData,
  summary: string,
): Promise<{ ok: boolean; commitUrl?: string; error?: string }> {
  const { token, owner, repo, branch, filePath } = ghConfig();
  if (!token) return { ok: false, error: "GITHUB_TOKEN not configured" };

  try {
    // 1. current file sha
    const headRes = await ghFetch(
      ghApi(`/repos/${owner}/${repo}/contents/${filePath}?ref=${encodeURIComponent(branch)}`),
      { method: "GET" },
    );
    if (!headRes.ok) return { ok: false, error: `GitHub read failed (${headRes.status})` };
    const head = (await headRes.json()) as { sha: string };

    // 2. commit update
    const putRes = await ghFetch(ghApi(`/repos/${owner}/${repo}/contents/${filePath}`), {
      method: "PUT",
      body: JSON.stringify({
        message: `admin: ${summary.slice(0, 120)}`,
        content: Buffer.from(JSON.stringify(data, null, 2) + "\n", "utf-8").toString("base64"),
        branch,
        sha: head.sha,
      }),
    });
    if (!putRes.ok) {
      const errText = await putRes.text().catch(() => "");
      return { ok: false, error: `GitHub commit failed (${putRes.status}) ${errText.slice(0, 200)}` };
    }
    const put = (await putRes.json()) as { commit?: { html_url?: string } };
    return { ok: true, commitUrl: put.commit?.html_url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "GitHub commit error" };
  }
}

/**
 * Commit an arbitrary file (e.g. an uploaded certificate) to the repo.
 */
export async function commitRepoFile(
  repoPath: string,
  base64: string,
  message: string,
): Promise<{ ok: boolean; error?: string }> {
  const { token, owner, repo, branch } = ghConfig();
  if (!token) return { ok: false, error: "GITHUB_TOKEN not configured" };
  try {
    // If the file already exists we need its sha to update it
    let sha: string | undefined;
    const headRes = await ghFetch(
      ghApi(`/repos/${owner}/${repo}/contents/${repoPath}?ref=${encodeURIComponent(branch)}`),
      { method: "GET" },
    );
    if (headRes.ok) {
      const head = (await headRes.json()) as { sha?: string };
      sha = head.sha;
    }
    const putRes = await ghFetch(ghApi(`/repos/${owner}/${repo}/contents/${repoPath}`), {
      method: "PUT",
      body: JSON.stringify({
        message: `admin: ${message.slice(0, 120)}`,
        content: base64,
        branch,
        ...(sha ? { sha } : {}),
      }),
    });
    if (!putRes.ok) {
      const errText = await putRes.text().catch(() => "");
      return { ok: false, error: `GitHub upload failed (${putRes.status}) ${errText.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "GitHub upload error" };
  }
}

/**
 * Optional: trigger a Vercel deployment when the site is not Git-connected.
 */
export async function triggerDeployHook(): Promise<boolean> {
  const hook = process.env.VERCEL_DEPLOY_HOOK_URL;
  if (!hook) return false;
  try {
    await fetch(hook, { method: "POST" });
    return true;
  } catch {
    return false;
  }
}
