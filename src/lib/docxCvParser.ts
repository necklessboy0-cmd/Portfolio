import {
  certificates as currentCertificates,
  education as currentEducation,
  personal as currentPersonal,
  projects as currentProjects,
  skills as currentSkills,
} from "@/data/resume";

// ---------------------------------------------------------------------------
//  Parsed CV shape
// ---------------------------------------------------------------------------
export type ParsedCv = {
  fullName?: string;
  role?: string;
  email?: string;
  phone?: string;
  whatsappNumber?: string;
  location?: string;
  summary?: string;
  github?: string;
  linkedin?: string;
  instagram?: string;
  skills: string[];
  education: { degree: string; institution: string; years: string; details?: string }[];
  projects: { name: string; description: string; tags: string[]; link: string }[];
  certificates: { name: string; issuer: string; year: string }[];
  unparsed: string[];
};

// --- helpers ----------------------------------------------------------------

const headerAliases: Record<string, string[]> = {
  contact: ["contact", "contact details", "contact info", "reach me", "personal details"],
  summary: ["summary", "profile", "about", "about me", "objective", "career objective", "professional summary"],
  education: ["education", "education & qualifications", "qualifications", "academic", "academic background", "academics", "university", "certification", "certs"],
  skills: ["skills", "technical skills", "technologies", "tools & technologies", "tech stack", "hard skills", "core competencies"],
  projects: ["projects", "selected projects", "personal projects", "portfolio", "my projects", "work", "experience", "work experience", "professional experience"],
  certificates: ["certificates", "certifications", "certification", "training", "awards", "achievements", "honors"],
  languages: ["languages", "interests", "hobbies", "references", "additional", "extra curricular"],
};

function sectionFor(line: string): string | null {
  const l = line.toLowerCase().replace(/[:：\s]+$/, "").trim();
  for (const [canonical, aliases] of Object.entries(headerAliases)) {
    if (aliases.includes(l)) return canonical;
    if (aliases.includes(line.trim().toLowerCase())) return canonical;
  }
  // A short ALL-CAPS line is likely a section header
  const upper = line.trim();
  if (/^[A-Z][A-Z &/'+.\-]*$/.test(upper) && upper.length >= 3 && upper.length <= 42) {
    return "unknown";
  }
  return null;
}

const cleanLine = (s: string) =>
  s.replace(/^[•·▪●○‣\-–—*\d.]+/, "").trim();

function hasUrl(s: string) {
  return /(https?:\/\/|www\.)/i.test(s);
}

function firstUrl(s: string) {
  const m = s.match(/https?:\/\/[^\s)]+/i);
  return m ? m[0].replace(/[,;.]+$/, "") : "";
}

const emails = (text: string) => text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
const urlsFor = (text: string, host: string) =>
  (text.match(new RegExp(`https?:\\/\\/(?:www\\.)?${host}\\/[^\\s)"]+`, "gi")) || [])
    .map((u) => u.replace(/[,;.]+$/, ""));

function detectPhone(text: string): string | undefined {
  const m = text.match(/(\+?\d[\d\s\-().]{6,}\d)/);
  if (!m) return undefined;
  const digits = m[1].replace(/\D/g, "");
  const normalized = digits.replace(/^(0+)/, "");
  return `+${normalized.length >= 11 ? normalized : `92${normalized}`} `;
}

// --- main parser ------------------------------------------------------------

export function parseCvText(raw: string): ParsedCv {
  const parsed: ParsedCv = {
    skills: [],
    education: [],
    projects: [],
    certificates: [],
    unparsed: [],
  };
  const full = raw;
  const emailsFound = emails(full);
  const phoneFound = detectPhone(full);
  const linkedinFound = urlsFor(full, "linkedin.com")[0];
  const githubFound = urlsFor(full, "github.com")[0];
  const instagramFound = urlsFor(full, "instagram.com")[0];

  if (emailsFound[0]) parsed.email = emailsFound[0].toLowerCase();
  if (phoneFound) {
    const digits = phoneFound.replace(/\D/g, "");
    parsed.whatsappNumber = digits;
    let display = phoneFound;
    if (digits.length >= 11) {
      const national = digits.slice(-10);
      display = `+${digits.slice(0, digits.length - 10)} ${national.slice(0, 3)} ${national.slice(3)}`;
    }
    parsed.phone = display.trim();
  }
  if (linkedinFound) parsed.linkedin = linkedinFound.replace(/\?.*$/, "");
  if (githubFound) parsed.github = githubFound.replace(/\?.*$/, "");
  if (instagramFound) parsed.instagram = instagramFound.replace(/\?.*$/, "");

  // split into sections
  const sections: Record<string, string[]> = { header: [] };
  const paragraphs = full.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  let current = "header";
  for (const para of paragraphs) {
    const firstLine = para.split("\n")[0].trim();
    const detected = sectionFor(firstLine);
    if (detected) {
      current = detected;
      if (!sections[current]) sections[current] = [];
      // keep subsequent lines of the same paragraph
      const rest = para.split("\n").slice(1).map((l) => l.trim()).filter(Boolean);
      if (rest.length) sections[current].push(...rest);
    } else {
      sections[current].push(para);
    }
  }

  // --- header / contact: name, role, location -----------------------------
  const headerText = sections.header.join("\n");
  const nameCandidates = sections.header
    .flatMap((p) => p.split("\n"))
    .map((l) => l.trim())
    .filter((l) => l && !hasUrl(l) && !/[@\d+()\-]/.test(l))
    .map(cleanLine)
    .filter((l) => l.split(" ").length >= 2 && l.split(" ").length <= 4)
    .sort((a, b) => a.length - b.length);
  if (nameCandidates[0]) parsed.fullName = nameCandidates[0].replace(/\s{2,}/g, " ");

  const locMatch = headerText.match(/([A-Za-z\s,.-]+Pakistan|[A-Za-z\s,.-]+City|[A-Za-z\s]+,\s*[A-Za-z]{2,})/);
  if (locMatch) parsed.location = locMatch[1].trim();

  const roleLines = sections.header
    .flatMap((p) => p.split("\n"))
    .map(cleanLine)
    .filter((l) => /developer|engineer|designer|builder|student|freelancer/i.test(l));
  if (roleLines[0]) parsed.role = roleLines[0];

  // --- summary ---------------------------------------------------------------
  if (sections.summary?.length) parsed.summary = sections.summary.map(cleanLine).join(" ").replace(/\s{2,}/g, " ");

  // --- education --------------------------------------------------------------
  if (sections.education?.length) {
    parsed.education = sections.education.map((para) => {
      const lines = para.split("\n").map(cleanLine).filter(Boolean);
      const years = lines.find((l) => /\b(19|20)\d{2}\b/.test(l)) || "";
      const institution = lines.find((l) => /(university|college|academy|institute|campus|school|board|center)/i.test(l)) || "";
      const degree = lines.find((l) => l !== institution && l !== years) || lines[0] || "";
      const details = lines.filter((l) => l !== institution && l !== years && l !== degree).join(" ");
      return { degree, institution, years, details: details || undefined };
    }).filter((e) => e.degree || e.institution);
  }

  // --- skills ------------------------------------------------------------------
  const skillText = (sections.skills || []).map(cleanLine).filter(Boolean).join(", ");
  if (skillText) {
    const split = skillText.split(/[,;|•·▪●–—]|\n/).map((s) => cleanLine(s)).filter(Boolean);
    parsed.skills = split.slice(0, 14);
  }

  // --- projects / experience -----------------------------------------------------
  const projectGroup = [...(sections.projects || []), ...(sections.certificates || []).filter((p) => hasUrl(p))];
  for (const para of projectGroup) {
    const lines = para.split("\n").map(cleanLine).filter(Boolean);
    const linkLine = lines.find(hasUrl);
    if (!linkLine) continue;
    const link = firstUrl(linkLine);
    const otherLines = lines.filter((l) => !hasUrl(l) && l.toLowerCase() !== "description" && l.toLowerCase() !== "technologies");
    const name = otherLines[0] || link.replace(/^https?:\/\//, "").split("/")[0];
    const desc = otherLines.slice(1).join(" ").replace(/\s{2,}/g, " ");
    const techLine = lines.find((l) => /^(tech|tools|stack|languages|technologies)\b/i.test(l)) || "";
    const tags = techLine
      ? techLine.replace(/^[^:]+[:：]?\s*/i, "").split(/[,;|\n]/).map(cleanLine).filter(Boolean)
      : [];
    parsed.projects.push({ name, description: desc, tags, link });
  }

  // --- certificates ----------------------------------------------------------------
  const certSection = [...(sections.certificates || [])];
  for (const para of certSection) {
    if (hasUrl(para)) continue; // already captured as a project
    const lines = para.split("\n").map(cleanLine).filter(Boolean);
    if (!lines.length) continue;
    const yearMatch = para.match(/\b(19|20)\d{2}\b/);
    const year = yearMatch ? yearMatch[0] : "";
    const issuer = lines.find((l) => /(academy|coursera|udemy|fcc|freecodecamp|university|institute|training|certification|company|google|microsoft|meta)/i.test(l)) || "";
    const name = lines.find((l) => l !== issuer && l !== year && !/^\d+$/.test(l)) || lines[0];
    if (name) parsed.certificates.push({ name, issuer, year });
  }

  // Anything we never categorised that might carry info
  parsed.unparsed = sections.header
    .concat(sections.languages || [])
    .filter((p) => p && !hasUrl(p)).slice(0, 10);

  return parsed;
}

// --- merge detected values with current site data ------------------------------

export function mergeParsed(parsed: ParsedCv) {
  const name = parsed.fullName || currentPersonal.name;
  const titleCase = name
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");

  return {
    personal: {
      name,
      shortName: titleCase,
      fullName: titleCase,
      role: parsed.role || currentPersonal.role,
      tagline: currentPersonal.tagline,
      summary: parsed.summary || currentPersonal.summary,
      email: parsed.email || currentPersonal.email,
      phone: parsed.phone || currentPersonal.phone,
      whatsappNumber: parsed.whatsappNumber || currentPersonal.whatsappNumber,
      location: parsed.location || currentPersonal.location,
      website: currentPersonal.website,
      availability: currentPersonal.availability,
      github: parsed.github || currentPersonal.github,
      linkedin: parsed.linkedin || currentPersonal.linkedin,
      instagram: parsed.instagram || currentPersonal.instagram,
    },
    education:
      parsed.education.length > 0
        ? parsed.education
        : currentEducation.map((e) => ({
            degree: e.degree,
            institution: e.institution,
            years: e.years,
            details: e.details,
          })),
    skills:
      parsed.skills.length > 0
        ? parsed.skills.map((name) => ({ name, level: 80 }))
        : currentSkills.map((s) => ({ name: s.name, level: s.level })),
    projects:
      parsed.projects.length > 0
        ? parsed.projects.map((p) => ({
            ...p,
            image: "",
            icon: "🚀",
          }))
        : currentProjects.map((p) => ({
            name: p.name,
            description: p.description,
            tags: p.tags,
            link: p.link,
            image: p.image || "",
            icon: p.icon || "🚀",
          })),
    certificates:
      parsed.certificates.length > 0
        ? parsed.certificates.map((c) => ({ ...c, image: "" }))
        : currentCertificates.map((c) => ({
            name: c.name,
            issuer: c.issuer,
            year: c.year,
            image: c.image || "",
          })),
  };
}

export type MergedCv = ReturnType<typeof mergeParsed>;