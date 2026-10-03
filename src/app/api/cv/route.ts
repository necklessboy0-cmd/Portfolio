import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { readResumeData } from "@/lib/resumeStore";
import { buildCvText } from "@/lib/cv";
import type { ResumeData } from "@/data/resume";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Auth-gated CV download. The CV stays VIEWABLE on the public site, but any
 * downloadable artifact (PDF / TXT) requires a valid admin session cookie —
 * verified server-side, so knowing the URL does not bypass the login.
 *
 * PDF  → real text-based PDF (selectable, ATS-parseable), black-and-white,
 *        clickable links, finance-first section order, no branding/logo.
 * TXT  → plain-text ATS version.
 */
export async function GET(req: NextRequest) {
  if (!verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value)) {
    return NextResponse.json({ error: "Login required to download the CV." }, { status: 401 });
  }
  const format = req.nextUrl.searchParams.get("format") === "txt" ? "txt" : "pdf";

  const { data } = await readResumeData();

  if (format === "txt") {
    return new Response(buildCvText(data), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": 'attachment; filename="Muhammad-Taswaib-CV.txt"',
        "Cache-Control": "private, no-store",
      },
    });
  }

  const doc = new (await import("jspdf")).jsPDF({ unit: "pt", format: "a4", compress: true });
  drawCv(doc, data);

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(110, 110, 110);
    doc.text(`${i} / ${pageCount}`, PAGE_W / 2, PAGE_H - 30, { align: "center" });
  }

  const bytes = doc.output("arraybuffer");
  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="Muhammad-Taswaib-CV.pdf"',
      "Cache-Control": "private, no-store",
    },
  });
}

// ---------------------------------------------------------------------------
// PDF layout — finance-first, black & white, Helvetica, A4.
// ---------------------------------------------------------------------------

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 56;
const CONTENT_W = PAGE_W - M * 2;
const INK: [number, number, number] = [17, 17, 17];
const GRAY: [number, number, number] = [70, 70, 70];

type Pdf = import("jspdf").jsPDF;
type Y = { y: number };

function ensureSpace(c: Y, doc: Pdf, needed: number) {
  if (c.y + needed > PAGE_H - 64) {
    doc.addPage();
    c.y = M;
  }
}

function sectionTitle(doc: Pdf, c: Y, title: string) {
  ensureSpace(c, doc, 34);
  c.y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text(title.toUpperCase(), M, c.y);
  c.y += 4;
  doc.setDrawColor(110, 110, 110);
  doc.setLineWidth(0.7);
  doc.line(M, c.y, M + CONTENT_W, c.y);
  c.y += 13;
}

function drawBody(
  doc: Pdf,
  c: Y,
  text: string,
  size = 10,
  opts?: { style?: "normal" | "bold" | "italic"; width?: number; gapAfter?: number; color?: [number, number, number] },
) {
  doc.setFont("helvetica", opts?.style ?? "normal");
  doc.setFontSize(size);
  doc.setTextColor(...(opts?.color ?? INK));
  const lines = doc.splitTextToSize(text, opts?.width ?? CONTENT_W) as string[];
  for (const line of lines) {
    ensureSpace(c, doc, size * 1.38);
    doc.text(line, M, c.y);
    c.y += size * 1.38;
  }
  c.y += opts?.gapAfter ?? 0;
}

function entryLine(
  doc: Pdf,
  c: Y,
  text: string,
  opts?: { link?: string; size?: number; style?: "normal" | "bold" | "italic"; width?: number; gapAfter?: number },
) {
  const size = opts?.size ?? 10.5;
  doc.setFont("helvetica", opts?.style ?? "bold");
  doc.setFontSize(size);
  doc.setTextColor(...INK);
  const lines = doc.splitTextToSize(text, opts?.width ?? CONTENT_W) as string[];
  lines.forEach((line, i) => {
    ensureSpace(c, doc, size * 1.4);
    if (opts?.link && i === 0) doc.textWithLink(line, M, c.y, { url: opts.link });
    else doc.text(line, M, c.y);
    c.y += size * 1.4;
  });
  c.y += opts?.gapAfter ?? 0;
}

function drawCv(doc: Pdf, data: ResumeData) {
  const p = data.personal;
  const c: Y = { y: 64 };

  // ---- header (clean, no logo, no branding)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...INK);
  doc.text(p.fullName.toUpperCase(), M, c.y);
  c.y += 15;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...GRAY);
  if (p.role) {
    doc.text(p.role, M, c.y);
    c.y += 13;
  }

  const contact = [
    { text: p.phone, href: p.phone ? `tel:${p.phone.replace(/\s+/g, "")}` : undefined },
    { text: p.email, href: `mailto:${p.email}` },
    { text: p.website, href: p.website },
    { text: p.location, href: undefined },
  ].filter((x) => x.text);

  doc.setFontSize(10);
  let cx = M;
  for (let i = 0; i < contact.length; i++) {
    const item = contact[i];
    const w = doc.getTextWidth(item.text);
    if (item.href) doc.textWithLink(item.text, cx, c.y, { url: item.href });
    else doc.text(item.text, cx, c.y);
    cx += w;
    if (i < contact.length - 1) {
      doc.text("  |  ", cx, c.y);
      cx += doc.getTextWidth("  |  ");
    }
  }
  c.y += 16;

  // ---- professional summary
  if (p.summary) {
    sectionTitle(doc, c, "Professional Summary");
    drawBody(doc, c, p.summary, 10, { gapAfter: 2 });
  }

  // ---- education (finance-first position)
  if (data.education.length) {
    sectionTitle(doc, c, "Education");
    for (const e of data.education) {
      entryLine(doc, c, e.degree, { link: e.link, size: 10.5 });
      const meta = [e.institution, e.years].filter(Boolean).join(" — ");
      if (meta) drawBody(doc, c, meta, 9.5, { style: "italic", color: GRAY });
      if (e.details) drawBody(doc, c, e.details, 9.5, { style: "italic", color: GRAY });
      c.y += 4;
    }
  }

  // ---- experience
  if (data.experience.length) {
    sectionTitle(doc, c, "Experience");
    for (const x of data.experience) {
      entryLine(doc, c, x.title, { link: x.link, size: 10.5 });
      const meta = [x.subtitle, x.year].filter(Boolean).join(" — ");
      if (meta) drawBody(doc, c, meta, 9.5, { style: "italic", color: GRAY });
      if (x.description) drawBody(doc, c, x.description, 9.5);
      c.y += 4;
    }
  }

  // ---- projects
  if (data.projects.length) {
    sectionTitle(doc, c, "Projects");
    for (const pr of data.projects) {
      entryLine(doc, c, pr.name, { link: pr.link, size: 10.5 });
      if (pr.description) drawBody(doc, c, pr.description, 9.5);
      if (pr.tags.length)
        drawBody(doc, c, `Technologies: ${pr.tags.join(", ")}`, 9, { style: "italic", color: GRAY });
      c.y += 4;
    }
  }

  // ---- certifications
  if (data.certificates.length) {
    sectionTitle(doc, c, "Certifications");
    for (const cert of data.certificates) {
      const meta = [cert.issuer, cert.year].filter(Boolean).join(" · ");
      entryLine(doc, c, cert.name, { link: cert.link, size: 10 });
      if (meta) drawBody(doc, c, meta, 9.5, { style: "italic", color: GRAY, gapAfter: 2 });
    }
  }

  // ---- courses
  if (data.courses.length) {
    sectionTitle(doc, c, "Courses");
    for (const co of data.courses) {
      const meta = [co.subtitle, co.year].filter(Boolean).join(" · ");
      entryLine(doc, c, co.title, { link: co.link, size: 10 });
      if (meta) drawBody(doc, c, meta, 9.5, { style: "italic", color: GRAY, gapAfter: 2 });
    }
  }

  // ---- custom sections (admin-created)
  for (const s of data.sections) {
    sectionTitle(doc, c, s.title);
    for (const it of s.items) {
      entryLine(doc, c, it.title, { link: it.link, size: 10 });
      const meta = [it.subtitle, it.year].filter(Boolean).join(" — ");
      if (meta) drawBody(doc, c, meta, 9.5, { style: "italic", color: GRAY });
      if (it.description) drawBody(doc, c, it.description, 9.5);
      c.y += 4;
    }
  }

  // ---- skills (compact bullet join — ATS-safe)
  if (data.skills.length) {
    sectionTitle(doc, c, "Skills");
    drawBody(doc, c, data.skills.map((s) => s.name).join("  •  "), 9.5, { gapAfter: 2 });
  }

  // ---- languages & interests
  if (data.languages.length) {
    sectionTitle(doc, c, "Languages");
    drawBody(doc, c, data.languages.join("  •  "), 9.5);
  }
  if (data.interests.length) {
    sectionTitle(doc, c, "Interests");
    drawBody(doc, c, data.interests.join("  •  "), 9.5);
  }
}
