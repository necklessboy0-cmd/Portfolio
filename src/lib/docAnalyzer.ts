import type { ResumeData } from "@/data/resume";

// ----------------------------------------------------------------------------
// Document understanding for the admin assistant.
//  • Extracts text from PDFs (pdf-parse), DOCX (mammoth) and images (OCR via
//    tesseract.js when present).
//  • Analyzes the extracted text into a structured qualification analysis:
//    document type, title, issuer, recipient, date, skills, suggested CV
//    section / heading / description — shown to the owner for confirmation
//    BEFORE anything is applied (nothing is auto-modified).
// ----------------------------------------------------------------------------

export type ExtractedDoc = {
  kind: "pdf" | "docx" | "image" | "text" | "unknown";
  text: string;
  pages?: number;
  method: string;
  warning?: string;
};

const noControl = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ");

async function extractPdf(buf: Buffer): Promise<ExtractedDoc> {
  try {
    // pdf-parse v2: PDFParse class — new PDFParse({ data }).getText() → pages[].text
    const mod = (await import("pdf-parse")) as unknown as {
      PDFParse: new (o: { data: Uint8Array }) => {
        getText: () => Promise<{ pages?: { text?: string }[]; text?: string }>;
        destroy?: () => Promise<void>;
      };
    };
    const parser = new mod.PDFParse({ data: new Uint8Array(buf) });
    let text = "";
    let pages: number | undefined;
    try {
      const res = await parser.getText();
      pages = res.pages?.length;
      text = (res.pages ?? []).map((pg) => pg.text ?? "").join("\n").trim() || (res.text ?? "");
    } finally {
      await parser.destroy?.();
    }
    text = noControl(text).replace(/[ \t]+\n/g, "\n").trim();
    if (text.length >= 40) {
      return { kind: "pdf", text, pages, method: "pdf text layer" };
    }
    return { kind: "pdf", text, pages, method: "pdf", warning: "little-text" };
  } catch (e) {
    return { kind: "pdf", text: "", method: "pdf", warning: e instanceof Error ? e.message : "parse failed" };
  }
}

async function extractDocx(buf: Buffer): Promise<ExtractedDoc> {
  try {
    const mammoth = (await import("mammoth")) as unknown as {
      extractRawText?: (o: { buffer: Buffer }) => Promise<{ value: string }>;
      default?: { extractRawText: (o: { buffer: Buffer }) => Promise<{ value: string }> };
    };
    const run = mammoth.extractRawText
      ? mammoth.extractRawText
      : (m: { buffer: Buffer }) => mammoth.default!.extractRawText(m);
    const res = await run({ buffer: buf });
    return { kind: "docx", text: noControl(res.value || "").trim(), method: "docx" };
  } catch (e) {
    return { kind: "docx", text: "", method: "docx", warning: e instanceof Error ? e.message : "parse failed" };
  }
}

async function extractImage(buf: Buffer): Promise<ExtractedDoc> {
  try {
    const mod: { default?: unknown; recognize?: unknown } = await import("tesseract.js");
    const tesseract = (mod.default ?? mod) as {
      recognize: (
        img: Buffer | string,
        langs?: string,
        opts?: Record<string, unknown>,
      ) => Promise<{ data: { text: string } }>;
    };
    const workerPath = process.env.TESSERACT_WORKER_PATH || undefined;
    const res = await tesseract.recognize(buf, "eng", workerPath ? { workerPath } : undefined);
    return { kind: "image", text: noControl(res.data.text || "").trim(), method: "ocr (tesseract)" };
  } catch (e) {
    return {
      kind: "image",
      text: "",
      method: "ocr",
      warning:
        "Automatic text recognition is not available in this environment. Type the certificate details and attach the file for the clickable link.",
    };
  }
}

export async function extractDocument(
  filename: string,
  mime: string,
  buf: Buffer,
): Promise<ExtractedDoc> {
  const lower = filename.toLowerCase();
  if (mime === "application/pdf" || lower.endsWith(".pdf")) return extractPdf(buf);
  if (lower.endsWith(".docx") || mime.includes("wordprocessingml")) return extractDocx(buf);
  if (mime.startsWith("image/") || /\.(png|jpe?g|webp)$/.test(lower)) return extractImage(buf);
  if (lower.endsWith(".txt") || mime.startsWith("text/")) {
    return { kind: "text", text: noControl(buf.toString("utf-8")).trim(), method: "plain text" };
  }
  return { kind: "unknown", text: "", method: "none", warning: "unsupported file type" };
}

// ------------------------------- analysis -----------------------------------

export type DocAnalysis = {
  documentType: string;
  qualification: string;
  issuer: string;
  recipient?: string;
  date?: string;
  suggestedSection: "certificates" | "courses" | "education" | "experience" | "skills";
  suggestedHeading: string;
  suggestedDescription: string;
  suggestedSkills: string[];
  hasLink: boolean;
  confidence: "high" | "medium" | "low";
  textPreview: string;
  charCount: number;
};

const MONTHS = "jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec";

function detectType(text: string, filename: string): string {
  const hay = `${filename} ${text}`.toLowerCase();
  if (/\b(degree|bachelor|master|b\.?sc|m\.?sc|b\.?com|m\.?com|university transcript|diploma degree)\b/.test(hay)) return "Degree";
  if (/\b(matric|intermediate|hssc|ssc|higher secondary|secondary school)\b/.test(hay)) return "Academic certificate";
  if (/\b(certificate of completion|completion certificate|course completion)\b/.test(hay)) return "Course completion certificate";
  if (/\b(certificat|credential|certified)\b/.test(hay)) return "Certificate";
  if (/\b(transcript|marksheet|marks sheet|statement of marks)\b/.test(hay)) return "Transcript";
  if (/\b(internship|experience letter|employment|recommendation letter)\b/.test(hay)) return "Experience letter";
  if (/\b(workshop|bootcamp|training)\b/.test(hay)) return "Training";
  if (/\b(award|winner|runner|olympia|competition)\b/.test(hay)) return "Award";
  return "Document";
}

function detectIssuer(text: string): string {
  const t = text.replace(/\s+/g, " ");
  const patterns = [
    /(?:issued by|awarded by|presented by|given by|provided by|organized by|conducted by)\s+([A-Z][^.,;\n\r]{2,60})/,
    /((?:institute|institute of|university|college|academy|school|foundation|association|council|board|society|corporation|company|labs?|inc\.?|ltd\.?|pvt\.?)\s*[^.,;\n\r]{0,50})/i,
  ];
  for (const re of patterns) {
    const m = t.match(re);
    if (m?.[1]) {
      // Stop at trailing boilerplate (dates, next-sentence keywords).
      return m[1]
        .split(/\b(?:dated|date|issued|awarded|on|in the year|this|has|is|to)\b/i)[0]
        .replace(/[\s:,-]+$/, "")
        .replace(/\s{2,}/g, " ")
        .trim()
        .slice(0, 60);
    }
  }
  const known = [
    "Coursera", "Udemy", "Google", "Microsoft", "Meta", "IBM", "AWS", "Amazon",
    "LinkedIn Learning", "EDX", "SACTANX", "ICAP", "HEC", "Higher Education Commission",
    "National Scholarship", "Al-Hamd", "Pak-Turk", "ASPIRE", "DigiSkills",
  ];
  for (const k of known) if (t.includes(k)) return k;
  return "";
}

function detectRecipient(text: string, ownerName: string): string | undefined {
  const m = text.match(/(?:awarded to|presented to|certifies that|this is to certify that|conferred upon|name\s*[:\-])\s*([A-Z][A-Za-z .]{2,50})/);
  if (m?.[1]) {
    const name = m[1].replace(/\b(is|has|was|have|successfully|completed)\b.*$/i, "").trim();
    if (name.length > 2) return name;
  }
  const first = ownerName.split(" ")[0]?.toLowerCase();
  const last = ownerName.split(" ").slice(-1)[0]?.toLowerCase();
  const m2 = text.match(new RegExp(`(${first ?? "x"}\\s+[A-Za-z]+(?:\\s+(?:${last ?? "y"}))?)(?=\\s*(?:\\n|has|is|for))`, "i"));
  return m2?.[1] ?? undefined;
}

function detectDate(text: string): string | undefined {
  const t = text.replace(/\s+/g, " ");
  const patterns = [
    new RegExp(`\\b(?:dated|date|issued on|completed on|awarded on)\\s*[:\\-]?\\s*((?:${MONTHS})[a-z]*\\.?\\s*\\d{1,2},?\\s*\\d{4}|\\d{1,2}\\s+(?:${MONTHS})[a-z]*\\.?\\s*,?\\s*\\d{4})`, "i"),
    new RegExp(`\\b((?:${MONTHS})[a-z]*\\.?\\s+\\d{4})\\b`, "i"),
    /\b(\d{1,2}[\/\\.-]\d{1,2}[\/\\.-]\d{2,4})\b/,
  ];
  for (const re of patterns) {
    const m = t.match(re);
    if (m?.[1]) return m[1].trim();
  }
  const y = t.match(/\b(20[12]\d)\b/);
  return y ? y[1] : undefined;
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w.length > 2 || /^[a-z]/.test(w) ? w.charAt(0).toUpperCase() + w.slice(1) : w.toUpperCase()))
    .join(" ")
    .trim();
}

function detectTitle(text: string, filename: string, docType: string): string {
  // "Certificate of Completion ... in/for/of X" style
  const t = text.replace(/\s+/g, " ");
  const STOP = /\s{2,}|\bissued\b|\bawarded\b|\bdated\b|\bby\b|\bwith\b|\bduring\b/i;
  // Preferred: "has completed the course X" / "completed the programme X"
  const mCompleted = t.match(/has\s+successfully\s+completed\s+(?:the|a|an)?\s*(?:course|programme|program|training|certification)?\s*(?:on|in|of)?\s*([A-Za-z0-9 .+#/&-]{6,70})/i)
    || t.match(/(?:completed|finished)\s+(?:the|a|an)?\s*(?:course|programme|program|training|certification)?\s*(?:on|in|of)?\s*([A-Za-z0-9 .+#/&-]{6,70})/i);
  if (mCompleted?.[1]) return titleCase(mCompleted[1].split(STOP)[0].trim());
  const m =
    t.match(/certificate\s+(?:of\s+)?(?:completion|achievement|participation|appreciation)?\s*(?:in|for|of)\s+([A-Za-z0-9 .+#/&-]{4,70})/i) ||
    t.match(/(?:course|program|training)\s*[:\-]\s*([A-Za-z0-9 .+#/&-]{4,70})/i);
  if (m?.[1]) return titleCase(m[1].split(STOP)[0].trim());
  // first meaningful non-boilerplate line
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 6 && l.length < 90)
    .filter((l) => !/^(certificate|diploma|transcript|award|this is to certify|date|issued|presented|awarded|name|course|id|signature|verif|credential)/i.test(l));
  if (lines[0]) return titleCase(lines[0].replace(/[|_]+$/g, "").trim());
  const fromFile = filename
    .replace(/\.[^.]+$/, "")
    .replace(/[\d\s_-]+$/, "")
    .replace(/[_-]+/g, " ")
    .trim();
  if (fromFile.length > 3) return titleCase(fromFile);
  return docType === "Document" ? "Untitled Qualification" : docType;
}

const SKILL_HINTS: Record<string, RegExp> = {
  "Generative AI": /generative ai|gen ?ai|llm|large language/i,
  "Prompt Engineering": /prompt engineering|prompt design/i,
  "AI Application Development": /ai application|ai app|agentic/i,
  "Web Development": /web development|html|css|javascript|react|next\.?js/i,
  "Graphic Designing": /graphic design|adobe|photoshop|illustrator|canva/i,
  "MS Office": /ms office|microsoft office|excel|word|powerpoint/i,
  "Data Analytics": /data analytics|data analysis|power bi|tableau|dashboard/i,
  Accounting: /accounting|bookkeeping|financial statements|journal entries/i,
  Auditing: /audit(ing)?\b/i,
  Taxation: /taxation|income tax|sales tax|tax return/i,
  Finance: /finance|financial modeling|valuation|investment/i,
  Communication: /communication|presentation skills|public speaking/i,
  Leadership: /leadership|team management|team lead/i,
  Python: /python\b/i,
  "Machine Learning": /machine learning|deep learning|neural network/i,
  "Problem Solving": /problem solving|critical thinking|analytical/i,
  "Time Management": /time management|productivity/i,
  Marketing: /digital marketing|seo|social media marketing/i,
};

const ALL_KNOWN_SKILLS = Object.keys(SKILL_HINTS);

function detectSkills(text: string, data: ResumeData): string[] {
  const found = new Set<string>();
  for (const [skill, re] of Object.entries(SKILL_HINTS)) {
    if (re.test(text)) found.add(skill);
  }
  // also mention existing CV skills explicitly listed in the document
  for (const s of data.skills) {
    if (new RegExp(`\\b${s.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text)) found.add(s.name);
  }
  return [...found].slice(0, 6);
}

function detectSection(docType: string, title: string): DocAnalysis["suggestedSection"] {
  const hay = `${docType} ${title}`.toLowerCase();
  if (/degree|transcript|matric|intermediate|hssc|ssc|bachelor|master|b\.?com/.test(hay)) return "education";
  if (/internship|experience letter|employment/.test(hay)) return "experience";
  if (/workshop|training|bootcamp|course completion/.test(hay)) return "courses";
  return "certificates";
}

export function analyzeDocument(
  extracted: ExtractedDoc,
  filename: string,
  data: ResumeData,
): { analysis: DocAnalysis | null; error?: string } {
  const text = extracted.text;
  if (!text || text.length < 25) {
    return {
      analysis: null,
      error:
        extracted.warning ||
        "Could not read enough text from this document. Type the details instead and attach the file for the clickable link.",
    };
  }

  const docType = detectType(text, filename);
  const title = detectTitle(text, filename, docType);
  const issuer = detectIssuer(text);
  const date = detectDate(text);
  const recipient = detectRecipient(text, data.personal.fullName || data.personal.name);
  const section = detectSection(docType, title);
  const skills = detectSkills(text, data);

  const issuerText = issuer || "the issuing organization";
  const heading =
    section === "education"
      ? title
      : `${title} — ${issuerText}`;
  const descriptionBits: string[] = [];
  if (recipient && recipient.toLowerCase() !== (data.personal.fullName || "").toLowerCase()) {
    descriptionBits.push(`Awarded to ${recipient}`);
  }
  descriptionBits.push(`Issued by ${issuerText}`);
  if (date) descriptionBits.push(date);
  const suggestedDescription = `${docType} recognizing completion of ${title}${issuer ? `, issued by ${issuerText}` : ""}${date ? ` (${date})` : ""}.`.replace(/\s+/g, " ");

  const confidence: DocAnalysis["confidence"] =
    extracted.kind === "pdf" && issuer && title !== "Untitled Qualification"
      ? "high"
      : title !== "Untitled Qualification"
        ? "medium"
        : "low";

  return {
    analysis: {
      documentType: docType,
      qualification: title,
      issuer,
      recipient,
      date,
      suggestedSection: section,
      suggestedHeading: heading,
      suggestedDescription,
      suggestedSkills: skills,
      hasLink: true,
      confidence,
      textPreview: text.slice(0, 400),
      charCount: text.length,
    },
  };
}
