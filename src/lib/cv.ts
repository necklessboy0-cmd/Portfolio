import type { ResumeData } from "@/data/resume";

// ----------------------------------------------------------------------------
// ATS-friendly plain-text CV. Plain text keeps full URLs on purpose —
// recruiters' parsers and copy-paste both need the raw link.
// ----------------------------------------------------------------------------

const section = (title: string, body: string[]) =>
  [title.toUpperCase(), "=".repeat(title.length), ...body, ""].join("\n");

export function buildCvText(data: ResumeData): string {
  const p = data.personal;
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
      `WhatsApp: ${p.phone}`,
      p.location,
    ].join(" | "),
  );

  lines.push("");
  lines.push(section("Professional Summary", [p.summary]));

  lines.push(
    section(
      "Education",
      data.education
        .map((e) =>
          [
            `${e.degree} — ${e.institution}${e.link ? ` (${e.link})` : ""}${e.years ? ` (${e.years})` : ""}`,
            e.details ? `  ${e.details}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
        ),
    ),
  );

  lines.push(
    section(
      "Skills",
      data.skills.map((s) => `${s.name}${s.level ? ` — ${s.level}%` : ""}`),
    ),
  );

  if ((data.experience?.length ?? 0) > 0) {
    lines.push(
      section(
        "Experience",
        data.experience.map((x) =>
          [
            `- ${x.title}${x.subtitle ? ` — ${x.subtitle}` : ""}${x.year ? ` (${x.year})` : ""}`,
            x.description ? `  ${x.description}` : "",
            x.link ? `  Link: ${x.link}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
        ),
      ),
    );
  }

  lines.push(
    section(
      "Projects",
      data.projects.map((pr) =>
        [
          `- ${pr.name}`,
          `  ${pr.description}`,
          pr.tags.length > 0 ? `  Technologies: ${pr.tags.join(", ")}` : "",
          `  Link: ${pr.link}`,
        ]
          .filter(Boolean)
          .join("\n"),
      ),
    ),
  );

  lines.push(
    section(
      "Certifications",
      data.certificates.map(
        (c) =>
          `- ${c.name} — ${c.issuer}${c.link ? ` (${c.link})` : ""}${c.year ? ` (${c.year})` : ""}`,
      ),
    ),
  );

  if ((data.courses?.length ?? 0) > 0) {
    lines.push(
      section(
        "Courses & Training",
        data.courses.map((c) =>
          [
            `- ${c.title}${c.subtitle ? ` — ${c.subtitle}` : ""}${c.year ? ` (${c.year})` : ""}`,
            c.description ? `  ${c.description}` : "",
            c.link ? `  Link: ${c.link}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
        ),
      ),
    );
  }

  for (const sec of data.sections ?? []) {
    if (sec.items.length === 0) continue;
    lines.push(
      section(
        sec.title,
        sec.items.map((item) =>
          [
            `- ${item.title}${item.subtitle ? ` — ${item.subtitle}` : ""}${item.year ? ` (${item.year})` : ""}`,
            item.description ? `  ${item.description}` : "",
            item.link ? `  Link: ${item.link}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
        ),
      ),
    );
  }

  if ((data.interests?.length ?? 0) > 0) {
    lines.push(section("Interests", data.interests));
  }

  if ((data.languages?.length ?? 0) > 0) {
    lines.push(section("Languages", data.languages));
  }

  return lines.join("\n");
}
