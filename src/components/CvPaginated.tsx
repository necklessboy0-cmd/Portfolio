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
const GAP = 16;
const AVAILABLE = PAGE_H - PAD_TOP - PAD_BOTTOM - FOOTER_H - 8;

const p = personal;

function facts() {
  const social = [];
  if (p.github) social.push(p.github.replace(/^https?:\/\/(www\.)?/, ""));
  if (p.linkedin) social.push(p.linkedin.replace(/^https?:\/\/(www\.)?/, ""));
  if (p.instagram) social.push(p.instagram.replace(/^https?:\/\/(www\.)?/, ""));
  return social;
}

const blockDefs: { key: string; render: () => React.ReactNode }[] = [
  {
    key: "header",
    render: () => (
      <header className="cv-page-header">
        <h1>{p.fullName.toUpperCase()}</h1>
        <p style={{ fontSize: 14 }}>{p.role}</p>
        <p style={{ fontSize: 12, marginTop: 6, color: "#4b5563" }}>
          {p.phone} | {p.email} | {p.location}
        </p>
        <p style={{ fontSize: 12, color: "#4b5563" }}>
          Portfolio: {p.website}
          {p.whatsappNumber ? ` | WhatsApp: wa.me/${p.whatsappNumber}` : ""}
          {facts().length > 0 ? ` | ${facts().join(" | ")}` : ""}
        </p>
      </header>
    ),
  },
  {
    key: "summary",
    render: () => (
      <section>
        <h2>Summary</h2>
        <p style={{ fontSize: 13, lineHeight: 1.55 }}>{p.summary}</p>
      </section>
    ),
  },
  {
    key: "education",
    render: () => (
      <section>
        <h2>Education</h2>
        <ul>
          {education.map((e) => (
            <li key={e.degree} style={{ fontSize: 13 }}>
              <strong>{e.degree}</strong> — {e.institution}
              {e.years ? ` (${e.years})` : ""}
              {e.details && (
                <p style={{ fontSize: 12, color: "#4b5563", marginTop: 2 }}>
                  {e.details}
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>
    ),
  },
  {
    key: "skills",
    render: () => (
      <section>
        <h2>Skills</h2>
        <ul>
          {skills.map((s) => (
            <li key={s.name} style={{ fontSize: 13 }}>
              <strong>{s.name}</strong> — {s.level}%
            </li>
          ))}
        </ul>
      </section>
    ),
  },
  {
    key: "projects",
    render: () => (
      <section>
        <h2>Projects — Live Links</h2>
        <ul>
          {projects.map((pr) => (
            <li key={pr.name} style={{ fontSize: 13 }}>
              <strong>{pr.name.toUpperCase()}</strong> — {pr.description}
              {pr.tags.length > 0 && (
                <p style={{ fontSize: 12, color: "#4b5563", marginTop: 2 }}>
                  Tech: {pr.tags.join(", ")}
                </p>
              )}
              <p style={{ fontSize: 12, marginTop: 2 }}>
                Link:{" "}
                <a href={pr.link} target="_blank" rel="noreferrer noopener">
                  {pr.link}
                </a>
              </p>
            </li>
          ))}
        </ul>
      </section>
    ),
  },
  {
    key: "certificates",
    render: () => (
      <section>
        <h2>Certifications</h2>
        <ul>
          {certificates.map((c) => (
            <li key={c.name} style={{ fontSize: 13 }}>
              <strong>{c.name}</strong>
              {c.issuer ? ` — ${c.issuer}` : ""}
              {c.year ? ` (${c.year})` : ""}
            </li>
          ))}
        </ul>
      </section>
    ),
  },
  {
    key: "languages",
    render: () => (
      <section>
        <h2>Languages & Interests</h2>
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

function packBlocks(heights: Record<string, number>): string[][] {
  const pages: string[][] = [];
  let current: string[] = [];
  let used = 0;

  for (const def of blockDefs) {
    const h = heights[def.key] ?? 0;
    if (current.length > 0 && used + GAP + h > AVAILABLE) {
      pages.push(current);
      current = [];
      used = 0;
    }
    current.push(def.key);
    used += (used === 0 ? 0 : GAP) + h;
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
      for (const def of blockDefs) {
        const node = el.querySelector(`[data-block="${def.key}"]`);
        if (node) heights[def.key] = (node as HTMLElement).offsetHeight;
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

  const currentPages = pages ?? [blockDefs.map((d) => d.key)];
  const renderKey = (key: string) =>
    blockDefs.find((d) => d.key === key)?.render() ?? null;

  return (
    <div ref={sheetRef} id="cv-sheet">
      {currentPages.map((pageKeys, idx) => (
        <article key={idx} className="cv-page" data-page={idx + 1}>
          <div>
            {pageKeys.map((key) => (
              <div key={key} data-block={key}>
                {renderKey(key)}
              </div>
            ))}
          </div>
          <div className="cv-page-footer">
            <span>
              {p.fullName} — Curriculum Vitae
            </span>
            <span>
              Page {idx + 1} of {currentPages.length}
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}