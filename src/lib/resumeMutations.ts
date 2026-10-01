import type {
  Certificate,
  Education,
  Personal,
  Project,
  ResumeData,
  SectionItem,
  Skill,
} from "@/data/resume";

// ----------------------------------------------------------------------------
// Pure mutation engine — server-side apply of confirmed admin changes.
// The API layer reads/writes the file; these functions transform the data.
// Every function deep-clones first and returns a fresh result object.
// ----------------------------------------------------------------------------

export type MutationOp =
  | { type: "add-certificate"; certificate: Certificate }
  | { type: "add-education"; education: Education }
  | { type: "add-project"; project: Project }
  | { type: "add-skill"; skill: Skill }
  | { type: "add-course"; course: SectionItem }
  | { type: "add-experience"; experience: SectionItem }
  | { type: "add-section-item"; sectionId: string; sectionTitle: string; item: SectionItem }
  | { type: "update-personal"; fields: Partial<Personal> };

export type MutationResult = {
  ok: boolean;
  data: ResumeData;
  message: string;
};

export const slugify = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export function clone(data: ResumeData): ResumeData {
  return JSON.parse(JSON.stringify(data)) as ResumeData;
}

function ensureSection(data: ResumeData, sectionId: string, sectionTitle: string): void {
  const exists = (data.sections ?? []).some((s) => s.id === sectionId);
  if (exists) return;
  const section = { id: sectionId, title: sectionTitle, items: [] as SectionItem[] };
  data.sections = [...(data.sections ?? []), section];
}

export function applyMutation(data: ResumeData, op: MutationOp): MutationResult {
  const next = clone(data);

  if (op.type === "add-certificate") {
    const dup = next.certificates.some(
      (c) => c.name === op.certificate.name && c.issuer === op.certificate.issuer,
    );
    if (dup) return { ok: false, data, message: "That certificate already exists." };
    next.certificates = [...next.certificates, op.certificate];
    return { ok: true, data: next, message: `Added certificate "${op.certificate.name}" to Certifications.` };
  }

  if (op.type === "add-education") {
    const dup = next.education.some(
      (e) => e.degree === op.education.degree && e.institution === op.education.institution,
    );
    if (dup) return { ok: false, data, message: "That education entry already exists." };
    next.education = [...next.education, op.education];
    return { ok: true, data: next, message: `Added education "${op.education.degree}".` };
  }

  if (op.type === "add-project") {
    const dup = next.projects.some(
      (p) => p.name.toLowerCase() === op.project.name.toLowerCase(),
    );
    if (dup) return { ok: false, data, message: "That project already exists." };
    next.projects = [...next.projects, op.project];
    return { ok: true, data: next, message: `Added project "${op.project.name}".` };
  }

  if (op.type === "add-skill") {
    const dup = next.skills.some(
      (s) => s.name.toLowerCase() === op.skill.name.toLowerCase(),
    );
    if (dup) return { ok: false, data, message: "That skill already exists." };
    next.skills = [...next.skills, op.skill];
    return { ok: true, data: next, message: `Added skill "${op.skill.name}".` };
  }

  if (op.type === "add-course") {
    const dup = (next.courses ?? []).some(
      (c) => c.title.toLowerCase() === op.course.title.toLowerCase(),
    );
    if (dup) return { ok: false, data, message: "That course already exists." };
    next.courses = [...(next.courses ?? []), op.course];
    return { ok: true, data: next, message: `Added course "${op.course.title}".` };
  }

  if (op.type === "add-experience") {
    const dup = (next.experience ?? []).some(
      (x) => x.title.toLowerCase() === op.experience.title.toLowerCase(),
    );
    if (dup) return { ok: false, data, message: "That experience entry already exists." };
    next.experience = [...(next.experience ?? []), op.experience];
    return { ok: true, data: next, message: `Added experience "${op.experience.title}".` };
  }

  if (op.type === "add-section-item") {
    ensureSection(next, op.sectionId, op.sectionTitle);
    const section = (next.sections ?? []).find((s) => s.id === op.sectionId);
    if (!section) return { ok: false, data, message: "Could not create section." };
    const dup = section.items.some(
      (i) => i.title.toLowerCase() === op.item.title.toLowerCase(),
    );
    if (dup) return { ok: false, data, message: "That item already exists in the section." };
    section.items = [...section.items, op.item];
    return { ok: true, data: next, message: `Added "${op.item.title}" to section "${op.sectionTitle}".` };
  }

  if (op.type === "update-personal") {
    const keys = Object.keys(op.fields);
    if (keys.length === 0) return { ok: false, data, message: "No fields to update." };
    next.personal = { ...next.personal, ...op.fields };
    return { ok: true, data: next, message: `Updated ${keys.join(", ")}.` };
  }

  return { ok: false, data, message: "Unknown operation." };
}

export function applyMutations(data: ResumeData, ops: MutationOp[]): MutationResult {
  let current = data;
  const applied: string[] = [];
  for (const op of ops) {
    const r = applyMutation(current, op);
    if (!r.ok) {
      return { ok: false, data: current, message: `Stopped: ${r.message}` };
    }
    current = r.data;
    applied.push(r.message);
  }
  return {
    ok: true,
    data: current,
    message: applied.length === 1 ? applied[0] : `${applied.length} changes applied:\n${applied.map((m) => `• ${m}`).join("\n")}`,
  };
}
