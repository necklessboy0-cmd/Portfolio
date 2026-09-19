"use client";

import { useEffect, useRef, useState } from "react";
import {
  certificates,
  education,
  personal,
  projects,
  skills,
} from "@/data/resume";

const PAGE_H = 1160;
const PAD_TOP = 40;
const PAD_BOTTOM = 34;
const FOOTER_H = 34;
// Visual space *accounted* before a block (matches CSS margins):
//  - new section: h2 top margin (12px) + small buffer
//  - continuation item: ul marginTop (6px)
const GAP_SECTION = 14;
const GAP_ITEM = 6;
// Reserved height for a "(cont.)" heading when a section flows onto a new page
const CONT_H = 30;
const AVAILABLE = PAGE_H - PAD_TOP - PAD_BOTTOM - FOOTER_H - 8;

const p = personal;

function socialLinks() {
  const links: { label: string; href: string }[] = [];
  if (p.github) links.push({ label: "GitHub", href: p.github });
  if (p.linkedin) links.push({ label: "LinkedIn", href: p.linkedin });
  if (p.instagram) links.push({ label: "Instagram", href: p.instagram });
  return links;
}

const whatsappLink = p.whatsappNumber
  ? `https://wa.me/${p.whatsappNumber}`
  : "";

function ExtLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a href={href} target="_blank" rel="noreferrer noopener">
      {children}
    </a>
  );
}

// ---------------------------------------------------------------------------
// Atomic blocks — the CV paginates per *item*, not per section, so pages fill
// completely instead of jumping a whole section to the next page and leaving
// a large gap behind.
// ---------------------------------------------------------------------------
type Block = {
  key: string;
  section: string;
  isHead: boolean; // contains the section's <h2> heading
  contTitle?: string; // e.g. "Skills (cont.)" when it continues on a new page
  render: () => React.ReactNode;
};

function listItemBlocks(
  section: string,
  title: string,
  items: React.ReactNode[],
): Block[] {
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
      render: () => (
        <ul style={{ marginTop: GAP_ITEM }}>{item}</ul>
      ),
    })),
  ];
}

const eduItems = education.map((e) => (
  <li key={e.degree} style={{ fontSize: 13 }}>
    <strong>{e.degree}</strong> —{" "}
    {e.link ? <ExtLink href={e.link}>{e.institution}</ExtLink> : e.institution}
    {e.years ? ` (${e.years})` : ""}
    {e.details && (
      <p style={{ fontSize: 12, color: "#4b5563", marginTop: 2 }}>
        {e.details}
      </p>
    )}
  </li>
));

const skillItems = skills.map((s) => (
  <li key={s.name} style={{ fontSize: 13 }}>
    <strong>{s.name}</strong> — {s.level}%
  </li>
));

const projectItems = projects.map((pr) => (
  <li key={pr.name} style={{ fontSize: 13 }}>
    <strong>
      <ExtLink href={pr.link}>{pr.name.toUpperCase()}</ExtLink>
    </strong>{" "}
    — {pr.description}
    {pr.tags.length > 0 && (
      <p style={{ fontSize: 12, color: "#4b5563", marginTop: 2 }}>
        Tech: {pr.tags.join(", ")}
      </p>
    )}
    <p style={{ fontSize: 12, marginTop: 2 }}>
      Live Link: <ExtLink href={pr.link}>Open Project ↗</ExtLink>
    </p>
  </li>
));

const certItems = certificates.map((c) => (
  <li key={c.name} style={{ fontSize: 13 }}>
    <strong>{c.name}</strong>
    {c.issuer ? (
      c.link ? (
        <>
          {" "}
          — <ExtLink href={c.link}>{c.issuer}</ExtLink>
        </>
      ) : (
        ` — ${c.issuer}`
      )
    ) : null}
    {c.year ? ` (${c.year})` : ""}
  </li>
));

const blocks: Block[] = [
  {
    key: "header",
    section: "header",
    isHead: true,
    render: () => (
      <header className="cv-page-header">
        <h1>{p.fullName.toUpperCase()}</h1>
        <p style={{ fontSize: 14 }}>{p.role}</p>
        <p style={{ fontSize: 12, marginTop: 6, color: "#4b5563" }}>
          {p.phone} |{" "}
          <a href={`mailto:${p.email}`}>{p.email}</a> |{" "}
          <ExtLink href={p.website}>Website</ExtLink> | {p.location}
        </p>
        <p style={{ fontSize: 12, color: "#4b5563" }}>
          {socialLinks().map((s, i) => (
            <span key={s.label}>
              {i > 0 && " | "}
              <ExtLink href={s.href}>{s.label}</ExtLink>
            </span>
          ))}
          {whatsappLink && (
            <span>
              {socialLinks().length > 0 ? " | " : ""}
              <ExtLink href={whatsappLink}>WhatsApp: {p.phone}</ExtLink>
            </span>
          )}
        </p>
      </header>
    ),
  },
  {
    key: "summary",
    section: "summary",
    isHead: true,
    render: () => (
      <section>
        <h2>Summary</h2>
        <p style={{ fontSize: 13, lineHeight: 1.55 }}>{p.summary}</p>
      </section>
    ),
  },
  ...listItemBlocks("education", "Education", eduItems),
  ...listItemBlocks("skills", "Skills", skillItems),
  ...listItemBlocks("projects", "Projects — Live Links", projectItems),
  ...listItemBlocks("certificates", "Certifications", certItems),
  {
    key: "languages",
    section: "languages",
    isHead: true,
    render: () => (
      <section>
        <h2>Languages &amp; Interests</h2>
        <p style={{ fontSize: 13 }}>
          <strong>Languages:</strong> Urdu — Native/Fluent | English — Moderate
        </p>
        <p style={{ fontSize: 13 }}>
          <strong>Interests:</strong> Generative AI &amp; Prompt Engineering,
          Data Analytics, Finance &amp; Accounting
        </p>
      </section>
    ),
  },
];

const blockByKey = Object.fromEntries(blocks.map((b) => [b.key, b]));

function packBlocks(heights: Record<string, number>): string[][] {
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
  const sheetRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<string[][] | null>(null);

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
        // Exclude the "(cont.)" heading from the block's intrinsic height —
        // packBlocks reserves CONT_H for it separately.
        if (node.querySelector("h2[data-cont]")) h -= CONT_H;
        heights[def.key] = h;
      }
      const next = packBlocks(heights);
      if (!cancelled) setPages(next);
    };

    compute();
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => !cancelled && compute());
    }
    const timer = setTimeout(compute, 350);
    const onResize = () => {
      clearTimeout(timer);
      setTimeout(compute, 250);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const currentPages = pages ?? [blocks.map((b) => b.key)];

  // Which page holds each section's heading — needed to render "(cont.)"
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
        // Only the first continuation block on a page shows the "(cont.)" heading
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
                  b &&
                  !b.isHead &&
                  headPage.get(b.section) !== idx &&
                  key === firstContKey;
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
                <ExtLink href={p.website}>{p.fullName}</ExtLink> — Curriculum
                Vitae
              </span>
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
