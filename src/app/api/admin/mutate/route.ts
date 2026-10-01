import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { readResumeData, writeResumeDataLocal, commitResumeData, triggerDeployHook } from "@/lib/resumeStore";
import { applyMutations } from "@/lib/resumeMutations";
import { parseIntents, proposalsToOps, type Proposal } from "@/lib/intentParser";
import type { ResumeData } from "@/data/resume";

export const runtime = "nodejs";

function authorized(req: NextRequest): boolean {
  return verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
}

type Body = {
  action: "parse" | "confirm";
  message?: string;       // for parse
  ops?: unknown;          // for confirm
  note?: string;
};

function describe(p: Proposal): string {
  if (p.kind === "certificate")
    return `Certificate → ${p.certificate.name}${p.certificate.issuer && p.certificate.issuer !== "—" ? ` · ${p.certificate.issuer}` : ""}${p.certificate.year ? ` · ${p.certificate.year}` : ""}${p.certificate.link ? ` · link` : ""}`;
  if (p.kind === "education")
    return `Education → ${p.education.degree} · ${p.education.institution}${p.education.years ? ` · ${p.education.years}` : ""}`;
  if (p.kind === "project")
    return `Project → ${p.project.name}${p.project.link ? ` · ${p.project.link}` : ""}`;
  if (p.kind === "skill") return `Skill → ${p.skill.name}${p.skill.level ? ` (${p.skill.level}%)` : ""}`;
  if (p.kind === "course") return `Course → ${p.course.title}${p.course.subtitle ? ` · ${p.course.subtitle}` : ""}`;
  if (p.kind === "experience") return `Experience → ${p.experience.title}${p.experience.subtitle ? ` · ${p.experience.subtitle}` : ""}`;
  if (p.kind === "section-item")
    return `Section "${p.sectionTitle}" → ${p.item.title}`;
  return `Personal info → ${Object.entries(p.fields).map(([k, v]) => `${k}: "${v}"`).join(", ")}`;
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { data } = await readResumeData();

  // ---------------------------- parse -------------------------------------
  if (body.action === "parse") {
    const outcome = parseIntents(body.message ?? "", data);
    if (!outcome.ok) {
      return NextResponse.json({ ok: false, help: outcome.help });
    }
    const ops = proposalsToOps(outcome.proposals);
    const preview = outcome.proposals.map(describe);
    return NextResponse.json({
      ok: true,
      ops,
      preview,
      note: outcome.note,
    });
  }

  // --------------------------- confirm -------------------------------------
  if (body.action === "confirm") {
    if (!Array.isArray(body.ops) || body.ops.length === 0) {
      return NextResponse.json({ error: "No changes to apply." }, { status: 400 });
    }
    const result = applyMutations(data, body.ops as never);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.message }, { status: 409 });
    }
    const newData = result.data;

    let persisted: "local" | "github" | "none" = "none";
    let commitUrl: string | undefined;
    let error: string | undefined;

    if (process.env.VERCEL) {
      const gh = await commitResumeData(newData, body.note || "update CV data");
      if (gh.ok) {
        persisted = "github";
        commitUrl = gh.commitUrl;
        await triggerDeployHook();
      } else {
        error = gh.error;
      }
    } else {
      try {
        await writeResumeDataLocal(newData);
        persisted = "local";
      } catch {
        error = "Could not write the data file locally.";
      }
    }

    return NextResponse.json({
      ok: true,
      message: result.message,
      persisted,
      commitUrl,
      error,
      data: newData,
    });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
