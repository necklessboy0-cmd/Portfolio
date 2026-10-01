import type {
  Certificate,
  Education,
  Personal,
  Project,
  ResumeData,
  SectionItem,
  Skill,
} from "@/data/resume";
import type { MutationOp } from "./resumeMutations";
import { slugify } from "./resumeMutations";

// ----------------------------------------------------------------------------
// Intent parser — turns the admin's free-form message into structured,
// previewable changes. Heuristic & deterministic: the /admin UI always shows
// the parsed result for confirmation before anything is applied.
// ----------------------------------------------------------------------------

export type Proposal =
  | { kind: "certificate"; certificate: Certificate }
  | { kind: "education"; education: Education }
  | { kind: "project"; project: Project }
  | { kind: "skill"; skill: Skill }
  | { kind: "course"; course: SectionItem }
  | { kind: "experience"; experience: SectionItem }
  | { kind: "section-item"; sectionId: string; sectionTitle: string; item: SectionItem }
  | { kind: "personal"; fields: Partial<Personal> };

export type ParseOutcome =
  | { ok: true; proposals: Proposal[]; note?: string }
  | { ok: false; help: string };

const URL_RE = /(https?:\/\/[^\s),]+)/i;
const YEAR_RE = /\b(19|20)\d{2}\b/;

const firstUrl = (s: string): string => {
  const m = s.match(URL_RE);
  return m ? m[1].replace(/[.,;]+$/, "") : "";
};

const clean = (s: string) =>
  s
    .replace(/^[\s•·▪●○‣*\-–—\d.)]+/, "")
    .replace(/\s+/g, " ")
    .trim();

const stripLabel = (s: string, labels: string[]): string => {
  let out = s;
  for (const label of labels) {
    const re = new RegExp(`^${label}\\s*[:\\-–—]?\\s*`, "i");
    if (re.test(out)) {
      out = out.replace(re, "");
      break;
    }
  }
  return clean(out);
};

function detectKind(t: string): string | null {
  if (/\b(section|categor(y|ies)|new heading)\b/i.test(t)) return "section";
  if (/\b(certificates?|certifications?|credentials?)\b/i.test(t)) return "certificate";
  if (/\b(degree|diploma|matric|intermediate|hssc|ssc|bachelors?|masters?|bsc|msc|caf|acca|ca\b)/i.test(t)) return "education";
  if (/\b(courses?|training)\b/i.test(t)) return "course";
  if (/\b(projects?|apps?|websites?|built|launched)\b/i.test(t)) return "project";
  if (/\b(skills?|technologies|tools|stack)\b/i.test(t)) return "skill";
  if (/\b(experience|internship|job|worked|employment|freelance)\b/i.test(t)) return "experience";
  return null;
}

/** “Add to section Awards: Best Student, issuer HEC, 2025, link …” */
function parseSectionItem(t: string): Proposal | null {
  const m = t.match(/(?:to\s+)?section\s*[“"']?([^”"':,]{2,40})[”"']?\s*[:\-–—]\s*([^\n]+)/i);
  if (!m) return null;
  const sectionTitle = clean(m[1]);
  const body = clean(m[2]);
  const title = body.split(/[,;]/)[0].trim();
  if (!title) return null;
  const description = (() => {
    const d = t.match(/description\s*[:\-–—]\s*([^\n]+)/i);
    return d ? clean(d[1]) : undefined;
  })();
  return {
    kind: "section-item",
    sectionId: slugify(sectionTitle) || `section-${Date.now()}`,
    sectionTitle,
    item: {
      id: slugify(title) || `item-${Date.now()}`,
      title,
      subtitle: extractIssuer(t) || undefined,
      year: extractYear(t),
      description,
      link: firstUrl(t) || undefined,
    },
  };
}

// Extract "field: value" pairs for personal info updates
function extractPersonalFields(text: string): Partial<Personal> {
  const fields: Partial<Personal> = {};
  const lines = text.split(/\n|;/).map(clean).filter(Boolean);

  const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (emailMatch && /email|mail|contact/i.test(text)) fields.email = emailMatch[0].toLowerCase();

  const phoneMatch = text.match(/\+?\d[\d\s\-()]{8,14}\d/);
  if (phoneMatch && /phone|whatsapp|mobile|number/i.test(text)) {
    fields.phone = phoneMatch[0].trim();
    const digits = phoneMatch[0].replace(/\D/g, "").replace(/^0+/, "");
    if (digits.length >= 10) fields.whatsappNumber = digits.length >= 11 ? digits : `92${digits}`;
  }

  const urlMatch = firstUrl(text);
  if (urlMatch) {
    if (/github\.com/i.test(urlMatch)) fields.github = urlMatch;
    else if (/linkedin\.com/i.test(urlMatch)) fields.linkedin = urlMatch;
    else if (/instagram\.com/i.test(urlMatch)) fields.instagram = urlMatch;
    else if (/website|site|portfolio|url|link/i.test(text)) fields.website = urlMatch;
  }

  for (const line of lines) {
    let m = line.match(/^(?:my\s+)?(?:full\s+)?name\s*[:\-–—]\s*(.+)$/i);
    if (m) {
      const v = clean(m[1]);
      fields.name = v.toUpperCase();
      fields.shortName = v;
      fields.fullName = v;
      continue;
    }
    m = line.match(/^(?:my\s+)?(?:role|title|headline|position)\s*[:\-–—]\s*(.+)$/i);
    if (m) { fields.role = clean(m[1]); continue; }
    m = line.match(/^(?:my\s+)?tagline\s*[:\-–—]\s*(.+)$/i);
    if (m) { fields.tagline = clean(m[1]); continue; }
    m = line.match(/^(?:my\s+)?summary\s*[:\-–—]\s*(.+)$/i);
    if (m) { fields.summary = clean(m[1]); continue; }
    m = line.match(/^(?:my\s+)?location\s*[:\-–—]\s*(.+)$/i);
    if (m) { fields.location = clean(m[1]); continue; }
    m = line.match(/^(?:my\s+)?(?:availability|status)\s*[:\-–—]\s*(.+)$/i);
    if (m) { fields.availability = clean(m[1]); continue; }
  }
  return fields;
}

function extractYear(s: string): string {
  const m = s.match(YEAR_RE);
  return m ? m[0] : "";
}

function extractIssuer(s: string): string {
  // "issuer: X" / "by X" / "from X" / "issued by X"
  let m = s.match(/(?:issued?\s*)?(?:by|from|issuer)\s*[:\-–—]?\s*([A-Z0-9][^,;|(\n]{2,60})/i);
  if (m) return clean(m[1]);
  m = s.match(/(?:university|institute|academy|college|school|inc\.?|ltd\.?|pvt)\b[^,;|(\n]*/i);
  if (m) return clean(m[0]);
  return "";
}

function extractSkillsList(text: string): string[] {
  // After "skills:" take comma / bullet separated tokens, else the whole line
  const m = text.match(/skills?\s*[:\-–—]\s*([^\n]+)/i);
  const rawList = m ? m[1] : text;
  return rawList
    .split(/[,;•·|/]|\band\b/i)
    .map((s) => clean(s))
    .filter((s) => s.length > 1 && s.length < 40 && !URL_RE.test(s) && !/^(add|new|also|with)$/i.test(s))
    .slice(0, 8);
}

function extractTags(text: string): string[] {
  const m = text.match(/(?:tech(?:nologies)?|stack|tags|built with|tools)\s*[:\-–—]\s*([^\n]+)/i);
  if (!m) return [];
  return m[1]
    .split(/[,;•·|]/)
    .map((s) => clean(s))
    .filter(Boolean)
    .slice(0, 8);
}

function titleFromQuoted(text: string): string {
  const m = text.match(/["“']([^"”']{2,80})["”']/);
  return m ? m[1].trim() : "";
}

export function parseIntents(text: string, current: ResumeData): ParseOutcome {
  const t = text.trim();
  if (!t) {
    return { ok: false, help: "Tell me what to add or change — e.g. “Add certificate: Deep Learning, issuer Coursera, 2025, link https://…”." };
  }

  const kind = detectKind(t);
  const personalFields = extractPersonalFields(t);
  const proposals: Proposal[] = [];
  let note: string | undefined;

  // Personal info updates take priority when explicit "field: value" pairs exist
  const hasExplicitPairs = /^(?:my\s+)?(name|role|title|tagline|summary|location|availability|status|email|phone|whatsapp|website)\s*[:\-–—]/im.test(t);
  if (hasExplicitPairs && Object.keys(personalFields).length > 0) {
    proposals.push({ kind: "personal", fields: personalFields });
  }

  const lines = t.split(/\n+/).map(clean).filter(Boolean);
  const year = extractYear(t);
  const link = firstUrl(t);
  const issuer = extractIssuer(t);
  const quoted = titleFromQuoted(t);

  if (kind === "section") {
    const sectionItem = parseSectionItem(t);
    if (sectionItem) {
      proposals.push(sectionItem);
    } else {
      return {
        ok: false,
        help: "To add something to a new or existing section, use: “Add to section <Section name>: <item title>, issuer <org>, 2025, link <url>”. The section is created automatically if it doesn't exist yet.",
      };
    }
  } else if (kind === "certificate") {
    // Prefer "certificate: X" label, then quoted title, then first line
    let name = "";
    const labelled = t.match(/(?:certificates?|certifications?)\s*[:\-–—]\s*([^\n]+)/i);
    if (labelled) name = stripLabel(labelled[1].split(/[,;]/)[0], []);
    else if (quoted) name = quoted;
    else name = stripLabel(lines[0].replace(/^(?:add|new)\s+(?:a\s+)?(?:new\s+)?certificat\w*\s*(?:named|called|titled)?\s*/i, ""), []);
    name = clean(name) || "New Certificate";

    const description = (() => {
      const m = t.match(/description\s*[:\-–—]\s*([^\n]+)/i);
      return m ? clean(m[1]) : "";
    })();

    const cert: Certificate = {
      name,
      issuer: issuer || "—",
      year,
      image: "",
      link: link || undefined,
    };
    proposals.push({ kind: "certificate", certificate: cert });

    // Auto-derive skills from a "skills:" clause so the Skills section stays in sync
    const derived = extractSkillsList(t.replace(/^(?:add|new)\b[^\n:]*:/i, ""));
    if (/skills?\s*[:\-–—]/i.test(t)) {
      for (const s of derived.slice(0, 6)) {
        proposals.push({
          kind: "skill",
          skill: { name: s, level: 80 },
        });
      }
    }
    if (description) {
      note = `Description captured — it will appear with the certificate entry.`;
    }
  } else if (kind === "education") {
    let degree = "";
    const labelled = t.match(/(?:degree|qualification|program)\s*[:\-–—]\s*([^\n]+)/i);
    if (labelled) degree = clean(labelled[1]);
    else if (quoted) degree = quoted;
    else degree = stripLabel(lines[0].replace(/^(?:add|new)\s+(?:a\s+)?(?:new\s+)?(?:degree|education|qualification)\s*/i, ""), []);

    let institution = "";
    const inst = t.match(/(?:institution|university|school|college|univ)\s*[:\-–—]\s*([^\n]+)/i);
    if (inst) institution = clean(inst[1]);
    else institution = issuer || current.personal.location;

    const details = (() => {
      const m = t.match(/(?:details|grade|gpa|result|notes?)\s*[:\-–—]\s*([^\n]+)/i);
      return m ? clean(m[1]) : undefined;
    })();

    proposals.push({
      kind: "education",
      education: {
        degree: degree || "New Qualification",
        institution,
        years: year,
        details,
        link: link || undefined,
      },
    });
  } else if (kind === "course") {
    let title = "";
    const labelled = t.match(/courses?\s*[:\-–—]\s*([^\n]+)/i);
    if (labelled) title = clean(labelled[1].split(/[,;]/)[0]);
    else if (quoted) title = quoted;
    else title = stripLabel(lines[0].replace(/^(?:add|new)\s+(?:a\s+)?(?:new\s+)?courses?\s*/i, ""), []);
    title = title || "New Course";
    const description = (() => {
      const m = t.match(/description\s*[:\-–—]\s*([^\n]+)/i);
      return m ? clean(m[1]) : undefined;
    })();
    proposals.push({
      kind: "course",
      course: {
        id: slugify(title) || `course-${Date.now()}`,
        title,
        subtitle: issuer || undefined,
        year,
        description,
        link: link || undefined,
      },
    });
  } else if (kind === "project") {
    let name = "";
    const labelled = t.match(/(?:projects?|apps?|websites?)\s*[:\-–—]\s*([^\n]+)/i);
    if (labelled) name = clean(labelled[1].split(/[,;]/)[0]);
    else if (quoted) name = quoted;
    else name = stripLabel(lines[0].replace(/^(?:add|new)\s+(?:a\s+)?(?:new\s+)?(?:project|app|website)\s*(?:named|called)?\s*/i, ""), []);
    name = name || "New Project";
    const description = (() => {
      const m = t.match(/description\s*[:\-–—]\s*([^\n]+)/i);
      return m ? clean(m[1]) : "";
    })();
    proposals.push({
      kind: "project",
      project: {
        name,
        description: description || "New project — description coming soon.",
        tags: extractTags(t),
        link: link || current.personal.website,
        image: "",
        icon: "🚀",
      },
    });
  } else if (kind === "skill") {
    const list = extractSkillsList(t);
    if (list.length === 0) {
      return { ok: false, help: "Which skill(s) should I add? e.g. “Add skills: SQL, Power BI”" };
    }
    for (const s of list) {
      const levelMatch = t.match(new RegExp(`${s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*[:\\-–—]?\\s*(\\d{1,3})%?`, "i"));
      proposals.push({ kind: "skill", skill: { name: s, level: levelMatch ? Math.min(100, parseInt(levelMatch[1], 10)) : 80 } });
    }
  } else if (kind === "experience") {
    let title = "";
    let org = "";
    const roleM = t.match(/(?:role|position|job)\s*[:\-–—]\s*([^\n]+)/i);
    const orgM = t.match(/(?:at|company|organisation|organization|org|employer)\s*[:\-–—]\s*([^\n]+)/i);
    if (roleM) title = clean(roleM[1]);
    else if (quoted) title = quoted;
    else title = stripLabel(lines[0].replace(/^(?:add|new)\s+(?:a\s+)?(?:new\s+)?(?:experience|internship|job)\s*/i, ""), []);
    if (orgM) org = clean(orgM[1]);
    else org = issuer;
    const description = (() => {
      const m = t.match(/description\s*[:\-–—]\s*([^\n]+)/i);
      return m ? clean(m[1]) : undefined;
    })();
    const rangeM = t.match(/(\w+\s+(19|20)\d{2}\s*[-–—]\s*(?:(?:\w+\s+)?(19|20)\d{2}|present|current))/i);
    proposals.push({
      kind: "experience",
      experience: {
        id: slugify(title) || `exp-${Date.now()}`,
        title: title || "New Experience",
        subtitle: org || undefined,
        year: rangeM ? clean(rangeM[1]) : year,
        description,
        link: link || undefined,
      },
    });
  } else {
    // Unknown intent — if a bare URL was given, ask rather than guess
    if (Object.keys(personalFields).length > 0) {
      return { ok: true, proposals: [{ kind: "personal", fields: personalFields }] };
    }
    return {
      ok: false,
      help:
        "I couldn't confidently map that to a change. Try one of these patterns:\n" +
        "• “Add certificate: <name>, issuer <org>, 2025, link <url>”\n" +
        "• “Add course: <name>, issuer <org>, link <url>”\n" +
        "• “Add project: <name>, link <url>, tech: A, B”\n" +
        "• “Add skills: A, B, C”\n" +
        "• “Add education: <degree>, institution <org>, 2024”\n" +
        "• “Update email: x@y.com” / “Update role: …”",
    };
  }

  if (proposals.length === 0) {
    return { ok: false, help: "Nothing to change was detected — add a bit more detail." };
  }
  return { ok: true, proposals, note };
}

export function proposalsToOps(proposals: Proposal[]): MutationOp[] {
  return proposals.map((p) => {
    if (p.kind === "certificate") return { type: "add-certificate" as const, certificate: p.certificate };
    if (p.kind === "education") return { type: "add-education" as const, education: p.education };
    if (p.kind === "project") return { type: "add-project" as const, project: p.project };
    if (p.kind === "skill") return { type: "add-skill" as const, skill: p.skill };
    if (p.kind === "course") return { type: "add-course" as const, course: p.course };
    if (p.kind === "experience") return { type: "add-experience" as const, experience: p.experience };
    if (p.kind === "section-item") {
      return {
        type: "add-section-item" as const,
        sectionId: p.sectionId,
        sectionTitle: p.sectionTitle,
        item: p.item,
      };
    }
    return { type: "update-personal" as const, fields: p.fields };
  });
}
