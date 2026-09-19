import {
  certificates,
  education,
  personal,
  projects,
  skills,
} from "@/data/resume";

const p = personal;

function hasAny(text: string, words: string[]): boolean {
  return words.some((w) => text.includes(w));
}

function greeting(text: string): string | null {
  const words = ["hi", "hello", "hey", "salam", "assalam", "peace", "yo ", "good morning", "good evening", "good afternoon", "sup"];
  if (hasAny(text, words)) {
    const variations = [
      `Hello! 👋 I'm the AI assistant for ${p.name}. Ask me anything about his CV, education, skills, projects, certificates or how to contact him.`,
      `Hey there! 🚀 Great to see you. I can tell you all about ${p.name} — his projects, skills, education, certificates and more. What would you like to know?`,
      `Hi! ✨ Welcome. Everything I know is based on ${p.name}'s CV and projects. Just ask away!`,
    ];
    return variations[Math.floor(Math.random() * variations.length)];
  }
  return null;
}

function projectAnswer(text: string): string | null {
  const mentioned = projects.filter((pr) => {
    const name = pr.name.toLowerCase();
    return text.includes(name) || text.includes(name.replace(/\s+/g, ""));
  });

  if (mentioned.length > 0) {
    return mentioned
      .map(
        (pr) =>
          `🚀 ${pr.name}\n${pr.description}\nTech: ${pr.tags.join(", ")}\nClick here to open: ${pr.link}`,
      )
      .join("\n\n");
  }

  if (hasAny(text, ["project", "projects", "work", "apps", "app", "portfolio", "website", "websites", "what have you built", "live"])) {
    const list = projects
      .map((pr) => `• ${pr.name} — ${pr.link}`)
      .join("\n");
    return `Here are ${projects.length} selected projects:\n${list}\n\nAsk me about any of them by name for details! Each card on the portfolio also opens the live project.`;
  }
  return null;
}

function educationAnswer(): string {
  return education
    .map(
      (e) =>
        `🎓 ${e.degree}\n${e.institution} (${e.years})${e.details ? `\n${e.details}` : ""}`,
    )
    .join("\n\n");
}

function certificateAnswer(text: string): string | null {
  if (!hasAny(text, ["certificate", "certificates", "certification", "award", "achievement", "courses", "training"])) {
    return null;
  }
  return certificates
    .map((c) => `🏅 ${c.name}\n${c.issuer} (${c.year})`)
    .join("\n\n");
}

function contactAnswer(): string {
  const parts = [
    `Email: ${p.email}`,
    `Phone / WhatsApp: ${p.phone} (wa.me/${p.whatsappNumber})`,
    `Location: ${p.location}`,
    `GitHub: ${p.github}`,
    `LinkedIn: ${p.linkedin}`,
    `Instagram: ${p.instagram}`,
  ];
  return `You can reach ${p.shortName} at:\n\n${parts.join("\n")}`;
}

function skillsAnswer(): string {
  const list = skills.map((s) => `${s.name} (${s.level}%)`).join(", ");
  return `💻 ${p.shortName}'s skills:\n${list}`;
}

const FALLBACK =
  `I can help with questions about ${p.shortName}'s CV and projects. Try asking about:\n\n` +
  `• Who is ${p.shortName}?\n` +
  `• Education / study / college\n` +
  `• Skills\n` +
  `• Projects / apps\n` +
  `• Certificates\n` +
  `• Contact / email / phone / socials\n` +
  `• Download CV`;

export function answerAssistant(question: string): string {
  const t = question.toLowerCase().trim();
  if (!t) return "Please type a question 👇";

  const greetingAnswer = greeting(t);
  if (greetingAnswer) return greetingAnswer;

  if (hasAny(t, ["thank", "thanks", "shukria", "welcome"])) {
    return "You're welcome! 🚀 Anything else about the CV, projects or certificates?";
  }

  if (
    hasAny(t, ["who", "about", "introduce", "yourself", "developer", "what do you know"])
  ) {
    return (
      `🌟 This is the portfolio of ${p.name}.\n\n` +
      `${p.role} based in ${p.location}. ${p.summary}\n\n` +
      `Status: ${p.availability}`
    );
  }

  if (hasAny(t, ["name", "your name", "what is your name"])) {
    return `My name is ${p.shortName}, better known online as "${p.name}". 🚀`;
  }

  if (hasAny(t, ["education", "study", "studies", "studied", "college", "collage", "university", "degree", "school", "academic"])) {
    return `🎓 Education:\n\n${educationAnswer()}`;
  }

  if (hasAny(t, ["skill", "skills", "technology", "technologies", "stack", "languages", "tools"])) {
    return skillsAnswer();
  }

  const projectResult = projectAnswer(t);
  if (projectResult) return projectResult;

  const certResult = certificateAnswer(t);
  if (certResult) return certResult;

  if (hasAny(t, ["contact", "reach", "email", "mail", "phone", "number", "whatsapp", "social", "instagram", "github", "linkedin", "location", "address"])) {
    return contactAnswer();
  }

  if (hasAny(t, ["cv", "resume", "download cv", "download resume"])) {
    return `📄 You can download ${p.shortName}'s CV from the website:\n\n• Click "CV" in the top menu, or\n• Visit ${p.website}/cv\n\nYou'll get both a styled PDF and an ATS-friendly .TXT version.`;
  }

  if (
    hasAny(t, ["available", "freelance", "hire", "job", "collaborate", "work with"])
  ) {
    return (
      `🤝 ${p.availability}. To hire or collaborate, contact him via:\n\n` +
      `Email: ${p.email}\nWhatsApp: wa.me/${p.whatsappNumber}`
    );
  }

  if (hasAny(t, ["help", "what can you do", "commands", "options"])) {
    return FALLBACK;
  }

  return FALLBACK;
}