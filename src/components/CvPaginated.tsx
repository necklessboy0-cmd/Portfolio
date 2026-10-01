"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useResume } from "./ResumeProvider";
import type {
  Certificate,
  CustomSection,
  Education,
  Project,
  ResumeData,
  SectionItem,
  Skill,
} from "@/data/resume";

// ----------------------------------------------------------------------------
// ATS-friendly, black & white, auto-paginating CV.
//  • Pure semantic HTML (h1/h2/ul/li/a) — parses cleanly in ATS systems.
//  • Monochrome: black text, grey accents, underlined links (still clickable
//    in the generated PDF via link annotations in CvDownload).
//  • No logos, no branding, no decorative elements on the sheet.
//  • Item-level pagination so pages fill tightly (no mid-document gaps).
// ----------------------------------------------------------------------------

const PAGE_H = 1160;
const PAD_TOP = 40;
const PAD_BOTTOM = 34;
const FOOTER_H = 26;
const GAP_SECTION = 14;
const GAP_ITEM = 6;
const CONT_H = 30;
const AVAILABLE = PAGE_H - PAD_TOP - PAD_BOTTOM - FOOTER_H - 8;

// Monochrome palette
const INK = "#111111";
const MUTED = "#444444";
const LINE = "#111111";

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" style={{ color: INK, textDecoration: "underline" }}>
      {children}
    </a>
  );
}

// ------------------------------- blocks --------------------------------------

type Block = {
  key: string;
  section: string;
  isHead: boolean;
  contTitle?: string;
  render: () => React.ReactNode;
};

function listItemBlocks(section: string, title: string, items: React.ReactNode[]): Block[] {
  if (items.length === 0) return [];
  return [
    {
      key: `${section}-head`,
      section,
      isHead: true,
      render: () => (
        <section>
          <h2>{title}</h2>
          <ul>{items[0]}</ul>
        </section>
      ),
    },
    ...items.slice(1).map((item, i) => ({
      key: `${section}-item-${i + 1}`,
      section,
      isHead: false,
      contTitle: `${title} (cont.)`,
      render: () => <ul style={{ marginTop: GAP_ITEM }}>{item}</ul>,
    })),
  ];
}

function buildBlocks(data: ResumeData): Block[] {
  const p = data.personal;

  const socialLinks = [
    { label: "GitHub", href: p.github },
    { label: "LinkedIn", href: p.linkedin },
    { label: "Instagram", href: p.instagram },
  ].filter((s) => Boolean(s.href));
  const whatsappLink = p.whatsappNumber ? `https://wa.me/${p.whatsappNumber}` : "";

  const header: Block = {
    key: "header",
    section: "header",
    isHead: true,
    render: () => (
      <header>
        <h1 style={{ fontSize: 26, letterSpacing: "0.04em", color: INK, margin: "0 0 4px", textTransform: "uppercase" }}>
          {p.fullName}
        </h1>
        <p style={{ fontSize: 13, margin: "0 0 6px", color: MUTED }}>{p.role}</p>
        <p style={{ fontSize: 12, margin: "2px 0", color: INK }}>
          {p.phone}{" | "}
          <a href={`mailto:${p.email}`} style={{ color: INK, textDecoration: "underline" }}>{p.email}</a>
          {" | "}
          <ExtLink href={p.website}>Website</ExtLink>
          {" | "}{p.location}
        </p>
        <p style={{ fontSize: 12, margin: "2px 0", color: INK }}>
          {socialLinks.map((s, i) => (
            <span key={s.label}>
              {i > 0 && " | "}
              <ExtLink href={s.href}>{s.label}</ExtLink>
            </span>
          ))}
          {whatsappLink && (
            <span>
              {socialLinks.length > 0 && " | "}
              <ExtLink href={whatsappLink}>WhatsApp: {p.phone}</ExtLink>
            </span>
          )}
        </p>
      </header>
    ),
  };

  const summary: Block = {
    key: "summary",
    section: "summary",
    isHead: true,
    render: () => (
      <section>
        <h2>Professional Summary</h2>
        <p style={{ fontSize: 12.5, lineHeight: 1.5, color: INK }}>{p.summary}</p>
      </section>
    ),
  };

  const eduItems = data.education.map((e: Education) => (
    <li key={e.degree} style={{ fontSize: 12.5 }}>
      <strong>{e.degree}</strong>
      {e.years ? ` (${e.years})` : ""}
      <br />
      {e.link ? <ExtLink href={e.link}>{e.institution}</ExtLink> : e.institution}
      {e.details && (
        <p style={{ fontSize: 11.5, color: MUTED, marginTop: 2 }}>{e.details}</p>
      )}
    </li>
  ));

  const skillItems = data.skills.map((s: Skill) => (
    <li key={s.name} style={{ fontSize: 12.5 }}>
      <strong>{s.name}</strong>
      {s.level ? ` — ${s.level}%` : ""}
    </li>
  ));

  const projectItems = data.projects.map((pr: Project) => (
    <li key={pr.name} style={{ fontSize: 12.5 }}>
      <strong>
        <ExtLink href={pr.link}>{pr.name}</ExtLink>
      </strong>{" "}
      — {pr.description}
      {pr.tags.length > 0 && (
        <p style={{ fontSize: 11.5, color: MUTED, marginTop: 2 }}>Technologies: {pr.tags.join(", ")}</p>
      )}
      <p style={{ fontSize: 11.5, marginTop: 2 }}>
        Link: <ExtLink href={pr.link}>{pr.link.replace(/^https?:\/\//, "")}</ExtLink>
      </p>
    </li>
  ));

  const certItems = data.certificates.map((c: Certificate) => (
    <li key={`${c.name}-${c.issuer}`} style={{ fontSize: 12.5 }}>
      <strong>
        {c.link ? <ExtLink href={c.link}>{c.name}</ExtLink> : c.name}
      </strong>
      {c.issuer ? ` — ${c.issuer}` : ""}
      {c.year ? ` (${c.year})` : ""}
      {c.link && c.issuer ? (
        <>
          {" — "}
          <ExtLink href={c.link}>View certificate</ExtLink>
        </>
      ) : null}
    </li>
  ));

  const expItems = (data.experience ?? []).map((x: SectionItem) => (
    <li key={x.id} style={{ fontSize: 12.5 }}>
      <strong>
        {x.link ? <ExtLink href={x.link}>{x.title}</ExtLink> : x.title}
      </strong>
      {x.subtitle ? ` — ${x.subtitle}` : ""}
      {x.year ? ` (${x.year})` : ""}
      {x.description && (
        <p style={{ fontSize: 11.5, color: MUTED, marginTop: 2 }}>{x.description}</p>
      )}
    </li>
  ));

  const courseItems = (data.courses ?? []).map((c: SectionItem) => (
    <li key={c.id} style={{ fontSize: 12.5 }}>
      <strong>
        {c.link ? <ExtLink href={c.link}>{c.title}</ExtLink> : c.title}
      </strong>
      {c.subtitle ? ` — ${c.subtitle}` : ""}
      {c.year ? ` (${c.year})` : ""}
      {c.description && (
        <p style={{ fontSize: 11.5, color: MUTED, marginTop: 2 }}>{c.description}</p>
      )}
    </li>
  ));

  const customBlocks = (data.sections ?? []).flatMap((sec: CustomSection) =>
    listItemBlocks(
      sec.id,
      sec.title,
      sec.items.map((item) => (
        <li key={item.id} style={{ fontSize: 12.5 }}>
          <strong>
            {item.link ? <ExtLink href={item.link}>{item.title}</ExtLink> : item.title}
          </strong>
          {item.subtitle ? ` — ${item.subtitle}` : ""}
          {item.year ? ` (${item.year})` : ""}
          {item.description && (
            <p style={{ fontSize: 11.5, color: MUTED, marginTop: 2 }}>{item.description}</p>
          )}
        </li>
      )),
    ),
  );

  const extras: Block[] = [];
  const hasExtras =
    (data.languages?.length ?? 0) > 0 || (data.interests?.length ?? 0) > 0;
  if (hasExtras) {
    extras.push({
      key: "extras",
      section: "extras",
      isHead: true,
      render: () => (
        <section>
          <h2>Additional Information</h2>
          {(data.languages?.length ?? 0) > 0 && (
            <p style={{ fontSize: 12.5 }}>
              <strong>Languages:</strong> {data.languages.join(" | ")}
            </p>
          )}
          {(data.interests?.length ?? 0) > 0 && (
            <p style={{ fontSize: 12.5 }}>
              <strong>Interests:</strong> {data.interests.join(", ")}
            </p>
          )}
        </section>
      ),
    });
  }

  const blocks: Block[] = [
    header,
    summary,
    ...listItemBlocks("education", "Education", eduItems),
    ...listItemBlocks("skills", "Skills", skillItems),
    ...listItemBlocks("experience", "Experience", expItems),
    ...listItemBlocks("projects", "Projects", projectItems),
    ...listItemBlocks("certificates", "Certifications", certItems),
    ...listItemBlocks("courses", "Courses & Training", courseItems),
    ...customBlocks,
    ...extras,
  ];
  return blocks;
}

function packBlocks(
  blocks: Block[],
  heights: Record<string, number>,
): string[][] {
  const pages: string[][] = [];
  let current: string[] = [];
  let used = 0;
  const sectionsOnPage = new Set<string>();

  for (const b of blocks) {
    const isContinuation = !b.isHead && !sectionsOnPage.has(b.section);
    const h = (heights[b.key] ?? 0) + (isContinuation ? CONT_H : 0);
    const gap = current.length === 0 ? 0 : b.isHead ? GAP_SECTION : GAP_ITEM;

    if (current.length > 0 && used + gap + h > AVAILABLE) {
      pages.push(current);
      current = [];
      used = 0;
      sectionsOnPage.clear();
    }
    current.push(b.key);
    used += (current.length === 1 ? 0 : gap) + h;
    sectionsOnPage.add(b.section);
  }
  if (current.length > 0) pages.push(current);
  return pages;
}

export default function CvPaginated() {
  const data = useResume();
  const sheetRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<string[][] | null>(null);

  const blocks = useMemo(() => buildBlocks(data), [data]);
  const blockByKey = useMemo(
    () => Object.fromEntries(blocks.map((b) => [b.key, b])),
    [blocks],
  );

  useEffect(() => {
    let cancelled = false;

    const compute = () => {
      const el = sheetRef.current;
      if (!el) return;
      const heights: Record<string, number> = {};
      for (const def of blocks) {
        const node = el.querySelector(`[data-block="${def.key}"]`);
        if (!node) continue;
        let h = (node as HTMLElement).offsetHeight;
        if (node.querySelector("h2[data-cont]")) h -= CONT_H;
        heights[def.key] = h;
      }
      const next = packBlocks(blocks, heights);
      if (!cancelled) setPages(next);
    };

    compute();
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => !cancelled && compute());
    }
    const timer = setTimeout(compute, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [blocks]);

  const currentPages = pages ?? [blocks.map((b) => b.key)];

  const headPage = new Map<string, number>();
  currentPages.forEach((keys, pi) => {
    for (const k of keys) {
      const b = blockByKey[k];
      if (b?.isHead && !headPage.has(b.section)) headPage.set(b.section, pi);
    }
  });

  return (
    <div ref={sheetRef} id="cv-sheet">
      {currentPages.map((pageKeys, idx) => {
        const firstContKey = pageKeys.find((k) => {
          const b = blockByKey[k];
          return b && !b.isHead && headPage.get(b.section) !== idx;
        });
        return (
          <article key={idx} className="cv-page" data-page={idx + 1}>
            <div>
              {pageKeys.map((key) => {
                const b = blockByKey[key];
                const showCont =
                  b && !b.isHead && headPage.get(b.section) !== idx && key === firstContKey;
                return (
                  <div key={key} data-block={key}>
                    {showCont && b.contTitle && (
                      <h2 data-cont style={{ marginTop: 0 }}>
                        {b.contTitle}
                      </h2>
                    )}
                    {b?.render()}
                  </div>
                );
              })}
            </div>
            <div className="cv-page-footer">
              <span>
                Page {idx + 1} of {currentPages.length}
              </span>
            </div>
          </article>
        );
      })}
    </div>
  );
}
