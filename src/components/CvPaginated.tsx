"use client";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/*  CONTENT — edit your CV here, layout and pagination are automatic   */
/* ------------------------------------------------------------------ */

const CV = {
  name: "Muhammad Taswaib",
  title: "CA Student | Finance & Accounting",
  contact: [
    { label: "Karachi, Pakistan" },
    { label: "+92 341 9429291", href: "tel:+923419429291" },
    {
      label: "muhammadtaswaib0159@gmail.com",
      href: "mailto:muhammadtaswaib0159@gmail.com",
    },
    {
      label: "LinkedIn",
      href: "https://www.linkedin.com/in/muhammad-taswaib-8757b52b9",
    },
    { label: "GitHub", href: "https://github.com/necklessboy0-cmd" },
    {
      label: "Website",
      href: "https://portfolio-5hja-git-main-necklessboy0-4972.vercel.app/",
    },
  ] as { label: string; href?: string }[],

  summary:
    "Chartered Accountancy student at the Institute of Chartered Accountants of Pakistan (ICAP), with an accounting and commerce background from the University of Karachi. Combines a finance and accounting foundation with practical skills in data analytics and AI application development, and is keen to apply technology to real business and finance processes. Strong communicator and problem solver, comfortable working in teams.",

  education: [
    {
      title: "Chartered Accountancy (CA) – PRC, FTS-44, CAF",
      date: "Ongoing",
      sub: "Institute of Chartered Accountants of Pakistan (ICAP) | Results awaited",
    },
    {
      title: "ADC-II – Accounting & Commerce",
      date: "2025",
      sub: "University of Karachi | Result awaited",
    },
    {
      title: "HSSC – Pre-Engineering",
      date: "2021",
      sub: "Bahria College Karsaz | Grade A-1 (94%)",
    },
    {
      title: "Matriculation – Science",
      date: "",
      sub: "DHA SKBZ High School | Grade A (79.06%)",
    },
  ],

  skills: [
    {
      label: "Finance & Accounting",
      value:
        "Chartered Accountancy coursework (PRC, FTS-44, CAF), accounting and commerce fundamentals",
    },
    {
      label: "Data & Technology",
      value:
        "Data Analytics, MS Office, Python, Streamlit, APIs, Generative AI, Prompt Engineering, AI Application Development",
    },
    {
      label: "Professional",
      value:
        "Communication, Problem Solving, Team Management, Leadership, Adaptability, Creativity",
    },
  ],

  projects: [
    {
      name: "Thunder",
      href: "https://thunder-yoo9ildpztibs8t8u4fggd.streamlit.app/",
      stack: "Streamlit, Generative AI, Python, API",
      points: [
        "Built and deployed an AI-powered web application using Streamlit, Python and Generative AI APIs.",
      ],
    },
    {
      name: "CV Analyzer",
      href: "https://cv-analyzer-lwhzhfnhzdsfdwdg6kpwpc.streamlit.app/",
      stack: "Streamlit, Generative AI, Python",
      points: [
        "Developed an AI application that reviews resumes and suggests improvements.",
      ],
    },
    {
      name: "ResearchAssist",
      href: "https://vercel-researchassist.vercel.app/",
      stack: "Next.js, React, Tailwind CSS, AI",
      points: [
        "Created an AI-powered research assistant web app that helps users gather and organize information quickly.",
      ],
    },
  ],

  certifications: [
    "Generative and Agentic AI – ASPIRE Pakistan, Pak-Angels, HEC",
    "Web Development, Graphic Designing, Prompt Engineering – SACTANX",
    "Personal Presentation and Effectiveness – Al-Hamd Institute",
    "MS Office – Al-Hamd Institute",
    "Inter-School Olympia – Pak-Turk School",
  ],

  languages: "Urdu (native/fluent), English (intermediate)",
  interests: "Finance & Accounting, Data Analytics, Generative AI",
};

/* ------------------------------------------------------------------ */
/*  BLOCKS — smallest units that may move between pages                */
/*  A section heading is always kept together with its first item.     */
/* ------------------------------------------------------------------ */

type Block = { id: string; node: React.ReactNode };

const Heading = ({ children }: { children: React.ReactNode }) => (
  <h2 className="cvp-h2">{children}</h2>
);

function buildBlocks(): Block[] {
  const blocks: Block[] = [];

  blocks.push({
    id: "header",
    node: (
      <header className="cvp-header">
        <h1 className="cvp-name">{CV.name}</h1>
        <p className="cvp-title">{CV.title}</p>
        <p className="cvp-contact">
          {CV.contact.map((c, i) => (
            <React.Fragment key={c.label}>
              {i > 0 && <span className="cvp-sep">|</span>}
              {c.href ? <a href={c.href}>{c.label}</a> : <span>{c.label}</span>}
            </React.Fragment>
          ))}
        </p>
      </header>
    ),
  });

  blocks.push({
    id: "summary",
    node: (
      <section>
        <Heading>Professional Summary</Heading>
        <p className="cvp-p">{CV.summary}</p>
      </section>
    ),
  });

  CV.education.forEach((e, i) =>
    blocks.push({
      id: `edu-${i}`,
      node: (
        <section>
          {i === 0 && <Heading>Education</Heading>}
          <div className="cvp-row">
            <strong>{e.title}</strong>
            {e.date && <span className="cvp-date">{e.date}</span>}
          </div>
          <p className="cvp-sub">{e.sub}</p>
        </section>
      ),
    })
  );

  blocks.push({
    id: "skills",
    node: (
      <section>
        <Heading>Core Skills</Heading>
        <ul className="cvp-list">
          {CV.skills.map((s) => (
            <li key={s.label}>
              <strong>{s.label}: </strong>
              {s.value}
            </li>
          ))}
        </ul>
      </section>
    ),
  });

  CV.projects.forEach((p, i) =>
    blocks.push({
      id: `proj-${i}`,
      node: (
        <section>
          {i === 0 && <Heading>Projects</Heading>}
          <div className="cvp-row">
            <strong>{p.name}</strong>
            {p.href ? (
              <a className="cvp-date" href={p.href} target="_blank" rel="noopener noreferrer">
                Live demo ↗
              </a>
            ) : null}
          </div>
          <p className="cvp-sub cvp-italic">{p.stack}</p>
          <ul className="cvp-list">
            {p.points.map((pt) => (
              <li key={pt}>{pt}</li>
            ))}
          </ul>
        </section>
      ),
    })
  );

  blocks.push({
    id: "certs",
    node: (
      <section>
        <Heading>Certifications</Heading>
        <ul className="cvp-list">
          {CV.certifications.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </section>
    ),
  });

  blocks.push({
    id: "lang",
    node: (
      <section>
        <Heading>Languages & Interests</Heading>
        <p className="cvp-p">
          <strong>Languages: </strong>
          {CV.languages}
        </p>
        <p className="cvp-p">
          <strong>Interests: </strong>
          {CV.interests}
        </p>
      </section>
    ),
  });

  return blocks;
}

/* ------------------------------------------------------------------ */
/*  PAGINATION                                                         */
/* ------------------------------------------------------------------ */

function paginate(heights: number[], pageHeight: number): number[][] {
  const pages: number[][] = [[]];
  let used = 0;
  heights.forEach((h, i) => {
    const current = pages[pages.length - 1];
    if (used + h > pageHeight && current.length > 0) {
      pages.push([i]);
      used = h;
    } else {
      current.push(i);
      used += h;
    }
  });
  return pages;
}

export default function CvPaginated() {
  const blocks = React.useMemo(buildBlocks, []);
  const probeBodyRef = useRef<HTMLDivElement>(null);
  const probeBlocksRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<number[][]>([blocks.map((_, i) => i)]);

  const measure = React.useCallback(() => {
    const body = probeBodyRef.current;
    const holder = probeBlocksRef.current;
    if (!body || !holder) return;
    const pageHeight = body.clientHeight;
    const heights = Array.from(holder.children).map(
      (el) => (el as HTMLElement).offsetHeight
    );
    if (pageHeight > 0 && heights.length === blocks.length) {
      setPages(paginate(heights, pageHeight));
    }
  }, [blocks.length]);

  useLayoutEffect(measure, [measure]);

  // Re-measure once web fonts are loaded, since they change text height.
  useEffect(() => {
    // @ts-ignore
    document.fonts?.ready.then(measure);
  }, [measure]);

  return (
    <div className="cvp-root">
      <style>{CSS}</style>

      {/* Hidden probe: same width/height as a real page body */}
      <div className="cvp-probe" aria-hidden="true">
        <div className="cvp-body" ref={probeBodyRef}>
          <div ref={probeBlocksRef}>
            {blocks.map((b) => (
              <div key={b.id} className="cvp-block">
                {b.node}
              </div>
            ))}
          </div>
        </div>
      </div>

      {pages.map((idxs, p) => (
        <article className="cvp-page" key={p}>
          <div className="cvp-body">
            {idxs.map((i) => (
              <div key={blocks[i].id} className="cvp-block">
                {blocks[i].node}
              </div>
            ))}
          </div>
          {pages.length > 1 && (
            <footer className="cvp-footer">
              {CV.name} – Page {p + 1} of {pages.length}
            </footer>
          )}
        </article>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  STYLES — plain text, no tables/icons/columns so ATS parsers read   */
/*  it in the correct order. Exports cleanly to PDF via Print → Save.  */
/* ------------------------------------------------------------------ */

const CSS = `
.cvp-root {
  --ink: #1c2430;
  --muted: #55606e;
  --accent: #1f3a5f;
  --rule: #c8d0da;
  font-family: "Source Sans 3", "Segoe UI", Calibri, Arial, sans-serif;
  color: var(--ink);
  background: #e9ecf0;
  padding: 24px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}
.cvp-page {
  position: relative;
  box-sizing: border-box;
  width: 210mm;
  height: 297mm;
  background: #fff;
  padding: 16mm 18mm 20mm;
  box-shadow: 0 2px 14px rgba(20, 30, 45, 0.18);
  overflow: hidden;
  break-after: page;
}
.cvp-body {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
}
.cvp-probe {
  position: absolute;
  left: -99999px;
  top: 0;
  visibility: hidden;
  pointer-events: none;
  box-sizing: border-box;
  width: 210mm;
  height: 297mm;
  padding: 16mm 18mm 20mm;
}
.cvp-block { padding-bottom: 12px; display: flow-root; }

.cvp-header { text-align: center; padding-bottom: 4px; }
.cvp-name {
  margin: 0;
  font-size: 28px;
  line-height: 1.15;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--accent);
}
.cvp-title { margin: 4px 0 8px; font-size: 14px; color: var(--muted); }
.cvp-contact { margin: 0; font-size: 11.5px; color: var(--ink); }
.cvp-contact a { color: var(--accent); text-decoration: none; }
.cvp-sep { margin: 0 8px; color: var(--rule); }

.cvp-h2 {
  margin: 0 0 6px;
  padding-bottom: 3px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--accent);
  border-bottom: 1.5px solid var(--accent);
}
.cvp-p { margin: 0 0 3px; font-size: 11.5px; line-height: 1.5; }
.cvp-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  font-size: 12px;
}
.cvp-date { font-size: 11.5px; color: var(--muted); white-space: nowrap; text-decoration: none; }
a.cvp-date { color: var(--accent); }
.cvp-sub { margin: 1px 0 0; font-size: 11.5px; color: var(--muted); }
.cvp-italic { font-style: italic; }
.cvp-list { margin: 3px 0 0; padding-left: 18px; font-size: 11.5px; line-height: 1.5; }
.cvp-list li { margin-bottom: 2px; }

.cvp-footer {
  position: absolute;
  left: 18mm; right: 18mm; bottom: 9mm;
  text-align: center;
  font-size: 9.5px;
  color: var(--muted);
}

@page { size: A4; margin: 0; }
@media print {
  html, body { margin: 0; padding: 0; background: #fff; }
  .cvp-root { background: none; padding: 0; gap: 0; display: block; }
  .cvp-page {
    box-shadow: none;
    margin: 0;
    /* 1mm of slack: a page box exactly 297mm tall overflows the printed
       sheet by a sub-pixel, which inserts a blank page between every two
       pages. 296mm avoids that while remaining visually identical. */
    height: 296mm;
  }
  /* The last sheet must not force a trailing blank page. */
  .cvp-page:last-child { break-after: auto; page-break-after: auto; }
  .cvp-probe { display: none; }
}
`;
