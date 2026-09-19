import {
  certificates,
  education,
  personal,
  projects,
  skills,
} from "@/data/resume";

export type CvData = {
  personal: typeof personal;
  education: typeof education;
  skills: typeof skills;
  projects: typeof projects;
  certificates: typeof certificates;
};

const section = (title: string, body: string[]) =>
  [title.toUpperCase(), "=".repeat(title.length), ...body, ""].join("\n");

export function buildCvText(): string {
  const p = personal;
  const lines: string[] = [];

  lines.push(p.fullName.toUpperCase());
  lines.push(p.role);
  lines.push("");
  lines.push(
    [
      p.phone,
      `Email: ${p.email}`,
      `Website: ${p.website}`,
      `GitHub: ${p.github}`,
      `LinkedIn: ${p.linkedin}`,
      `WhatsApp: ${p.phone}`, // readable number; wa.me link lives in the PDF & site
      `${p.location}`,
    ].join(" | "),
  );

  lines.push("");
  lines.push(
    section("Summary", [p.summary]),
  );

  lines.push(
    section(
      "Education",
      education.map((e) => [
        `${e.degree} — ${e.institution} (${e.years})`,
        e.details ? `  ${e.details}` : "",
      ].filter(Boolean).join("\n")),
    ),
  );

  lines.push(
    section(
      "Skills",
      skills.map((s) => `${s.name} — ${s.level}%`),
    ),
  );

  lines.push(
    section(
      "Projects (Live Links)",
      projects.map((pr) =>
        [
          `- ${pr.name.toUpperCase()}`,
          `  ${pr.description}`,
          `  Tech: ${pr.tags.join(", ")}`,
          `  Link: ${pr.link}`,
        ].join("\n"),
      ),
    ),
  );

  lines.push(
    section(
      "Certifications",
      certificates.map((c) => `- ${c.name} — ${c.issuer} (${c.year})`),
    ),
  );

  lines.push(
    section(
      "Interests",
      ["Generative AI & Prompt Engineering", "Data Analytics", "Finance & Accounting", "AI Application Development"],
    ),
  );

  lines.push(
    section("Languages", ["Urdu — Native/Fluent", "English — Moderate"]),
  );

  // This CV is auto-generated from the site's data file
  // (src/data/resume.ts). Any project you add is listed here automatically.
  return lines.join("\n");
}