"use client";

import { useState } from "react";
import { useResume } from "./ResumeProvider";
import type { ResumeData } from "@/data/resume";

// ----------------------------------------------------------------------------
// CV downloads.
//  • "Download PDF" builds a REAL text-based PDF (selectable, ATS-parseable)
//    directly from the live data — not a screenshot. Links stay clickable.
//  • ".TXT" is the plain-text ATS fallback.
//  • "Print" uses the browser's print pipeline on the on-screen sheet.
// ----------------------------------------------------------------------------

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** PDF links must be absolute — resolve site-relative paths (e.g. uploaded
 *  certificates at /uploads/…) against the canonical site URL. */
let SITE_BASE = "";
function absUrl(href: string | undefined, base?: string): string {
  if (!href) return "";
  if (href.startsWith("http://") || href.startsWith("https://") || href.startsWith("mailto:")) {
    return href;
  }
  try {
    return new URL(href, base || SITE_BASE || window.location.origin).toString();
  } catch {
    return href;
  }
}

// ------------------------- text-based PDF builder ----------------------------

const INK = "#111111";
const PAGE_W = 595.28; // A4 pt
const PAGE_H = 841.89;
const M = 56; // margin
const CONTENT_W = PAGE_W - M * 2;

type Doc = import("jspdf").jsPDF;

class PdfCursor {
  doc: Doc;
  y: number;
  constructor(doc: Doc) {
    this.doc = doc;
    this.y = M;
  }
  ensure(h: number) {
    if (this.y + h > PAGE_H - M - 20) {
      this.doc.addPage();
      this.y = M;
    }
  }
}

function sectionHeading(doc: Doc, cur: PdfCursor, title: string) {
  cur.ensure(30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(INK);
  doc.text(title.toUpperCase(), M, cur.y);
  cur.y += 5;
  doc.setDrawColor(17, 17, 17);
  doc.setLineWidth(0.8);
  doc.line(M, cur.y, M + CONTENT_W, cur.y);
  cur.y += 13;
}

function bodyText(doc: Doc, cur: PdfCursor, text: string, opts?: { size?: number; indent?: number; style?: "normal" | "bold" | "italic"; gap?: number }) {
  const size = opts?.size ?? 10;
  const indent = opts?.indent ?? 0;
  doc.setFont("helvetica", opts?.style ?? "normal");
  doc.setFontSize(size);
  doc.setTextColor(INK);
  const lines = doc.splitTextToSize(text, CONTENT_W - indent) as string[];
  const lh = size * 1.38;
  for (const line of lines) {
    cur.ensure(lh);
    doc.text(line, M + indent, cur.y);
    cur.y += lh;
  }
  cur.y += opts?.gap ?? 0;
}

function linkLine(doc: Doc, cur: PdfCursor, label: string, href: string, size = 9.5) {
  if (!href) return;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(size);
  doc.setTextColor(INK);
  cur.ensure(size * 1.5);
  doc.textWithLink(label, M, cur.y, { url: absUrl(href, "") });
  cur.y += size * 1.5;
}

function bulletWithLink(
  doc: Doc,
  cur: PdfCursor,
  title: string,
  link: string | undefined,
  rest: string,
  description?: string,
  meta?: string,
) {
  doc.setFontSize(10);
  cur.ensure(14);
  let x = M + 10;
  doc.setFont("helvetica", "bold");
  doc.text("•", M, cur.y);
  if (link) {
    doc.textWithLink(title, x, cur.y, { url: absUrl(link, "") });
  } else {
    doc.text(title, x, cur.y);
  }
  x += doc.getTextWidth(title) + 3;
  if (rest) {
    doc.setFont("helvetica", "normal");
    const remaining = CONTENT_W - (x - M);
    const restLines = doc.splitTextToSize(rest, remaining) as string[];
    doc.text(restLines[0] ?? "", x, cur.y);
    cur.y += 10 * 1.38;
    for (let i = 1; i < restLines.length; i++) {
      cur.ensure(10 * 1.38);
      doc.text(restLines[i], M + 10, cur.y);
      cur.y += 10 * 1.38;
    }
  } else {
    cur.y += 10 * 1.38;
  }
  if (description) bodyText(doc, cur, description, { indent: 10, size: 9.5 });
  if (meta) bodyText(doc, cur, meta, { indent: 10, size: 9.5 });
  cur.y += 3;
}

function buildPdf(data: ResumeData, JsPdfCtor: new (o: Record<string, unknown>) => Doc): Doc {
  const p = data.personal;
  SITE_BASE = p.website || window.location.origin;
  const doc = new JsPdfCtor({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
    compress: true,
  });
  const cur = new PdfCursor(doc);

  // ---- header ----
  doc.setFont("helvetica", "bold");
  doc.setFontSize(19);
  doc.setTextColor(INK);
  doc.text(p.fullName.toUpperCase(), PAGE_W / 2, cur.y, { align: "center" });
  cur.y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.text(p.role, PAGE_W / 2, cur.y, { align: "center" });
  cur.y += 15;

  doc.setFontSize(9.5);
  const contact = `${p.phone}  |  ${p.location}`;
  doc.text(contact, PAGE_W / 2, cur.y, { align: "center" });
  cur.y += 13;
  doc.textWithLink(p.email, PAGE_W / 2 - 40, cur.y, { url: `mailto:${p.email}`, align: "center" });
  doc.textWithLink("Website", PAGE_W / 2 + 60, cur.y, { url: p.website });
  cur.y += 13;
  const socials: [string, string][] = [];
  if (p.github) socials.push(["GitHub", p.github]);
  if (p.linkedin) socials.push(["LinkedIn", p.linkedin]);
  if (p.instagram) socials.push(["Instagram", p.instagram]);
  if (p.whatsappNumber) socials.push(["WhatsApp", `https://wa.me/${p.whatsappNumber}`]);
  // spread socials horizontally
  const gap = 92;
  const startX = PAGE_W / 2 - ((socials.length - 1) * gap) / 2;
  socials.forEach(([label, href], i) => {
    doc.textWithLink(label, startX + i * gap, cur.y, { url: href });
  });
  cur.y += 20;

  // ---- summary ----
  sectionHeading(doc, cur, "Professional Summary");
  bodyText(doc, cur, p.summary, { gap: 6 });

  // ---- education ----
  sectionHeading(doc, cur, "Education");
  for (const e of data.education) {
    bulletWithLink(
      doc,
      cur,
      e.degree,
      e.link,
      `${e.institution}${e.years ? ` (${e.years})` : ""}`,
      e.details,
    );
  }
  cur.y += 4;

  // ---- skills ----
  sectionHeading(doc, cur, "Skills");
  bodyText(doc, cur, data.skills.map((s) => s.name).join("  •  "), { gap: 6 });

  // ---- experience ----
  if ((data.experience?.length ?? 0) > 0) {
    sectionHeading(doc, cur, "Experience");
    for (const x of data.experience) {
      bulletWithLink(doc, cur, x.title, x.link, `${x.subtitle ?? ""}${x.year ? ` (${x.year})` : ""}`, x.description);
    }
    cur.y += 4;
  }

  // ---- projects ----
  sectionHeading(doc, cur, "Projects");
  for (const pr of data.projects) {
    bulletWithLink(
      doc,
      cur,
      pr.name,
      pr.link,
      ` — ${pr.description}`,
      undefined,
      pr.tags.length ? `Technologies: ${pr.tags.join(", ")}` : undefined,
    );
  }
  cur.y += 4;

  // ---- certifications ----
  sectionHeading(doc, cur, "Certifications");
  for (const c of data.certificates) {
    bulletWithLink(
      doc,
      cur,
      c.name,
      c.link,
      ` — ${c.issuer}${c.year ? ` (${c.year})` : ""}`,
    );
  }
  cur.y += 4;

  // ---- courses ----
  if ((data.courses?.length ?? 0) > 0) {
    sectionHeading(doc, cur, "Courses & Training");
    for (const c of data.courses) {
      bulletWithLink(doc, cur, c.title, c.link, `${c.subtitle ?? ""}${c.year ? ` (${c.year})` : ""}`, c.description);
    }
    cur.y += 4;
  }

  // ---- custom sections ----
  for (const sec of data.sections ?? []) {
    if (sec.items.length === 0) continue;
    sectionHeading(doc, cur, sec.title);
    for (const item of sec.items) {
      bulletWithLink(doc, cur, item.title, item.link, `${item.subtitle ?? ""}${item.year ? ` (${item.year})` : ""}`, item.description);
    }
    cur.y += 4;
  }

  // ---- additional ----
  const extras: string[] = [];
  if ((data.languages?.length ?? 0) > 0) extras.push(`Languages: ${data.languages.join(", ")}`);
  if ((data.interests?.length ?? 0) > 0) extras.push(`Interests: ${data.interests.join(", ")}`);
  if (extras.length > 0) {
    sectionHeading(doc, cur, "Additional Information");
    for (const line of extras) bodyText(doc, cur, line, { gap: 2 });
  }

  // ---- page footers ----
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(85, 85, 85);
    doc.text(`${i} / ${total}`, PAGE_W / 2, PAGE_H - 24, { align: "center" });
  }
  return doc;
}

// --------------------------------- UI ----------------------------------------

export default function CvDownload({ sheetId }: { sheetId: string }) {
  const data = useResume();
  const [busy, setBusy] = useState<"pdf" | "txt" | null>(null);

  const downloadPdf = async () => {
    if (busy) return;
    setBusy("pdf");
    try {
      const { jsPDF } = await import("jspdf");
      const doc = buildPdf(data, jsPDF as unknown as new (o: Record<string, unknown>) => Doc);
      doc.save("Muhammad-Taswaib-CV.pdf");
    } catch (err) {
      console.error(err);
      window.print();
    } finally {
      setBusy(null);
    }
  };

  const downloadTxt = async () => {
    if (busy) return;
    setBusy("txt");
    try {
      const res = await fetch("/api/resume.txt");
      const text = await res.text();
      downloadBlob(
        new Blob([text], { type: "text/plain;charset=utf-8" }),
        "Muhammad-Taswaib-CV.txt",
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="no-print flex flex-wrap items-center justify-center gap-4">
      <button
        onClick={downloadPdf}
        disabled={busy !== null}
        className="btn-primary inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold uppercase tracking-wider text-white disabled:opacity-60"
      >
        {busy === "pdf" ? "Creating…" : "Download PDF"}
      </button>
      <button
        onClick={downloadTxt}
        disabled={busy !== null}
        className="btn-ghost inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold uppercase tracking-wider text-white disabled:opacity-60"
      >
        {busy === "txt" ? "Preparing…" : "Download ATS .TXT"}
      </button>
      <button
        onClick={() => window.print()}
        className="btn-ghost inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold uppercase tracking-wider text-white"
      >
        Print / Save as PDF
      </button>
      <span id={sheetId} className="hidden" />
    </div>
  );
}
