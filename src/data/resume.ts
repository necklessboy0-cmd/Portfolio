// ============================================================================
//  ⚡  SINGLE SOURCE OF TRUTH
//  Everything on the site — projects, CV, certificates, chatbot answers —
//  is generated from this one file. Edit this file and the whole site
//  (including the downloadable CV) updates AUTOMATICALLY.
//
//  HOW TO:
//  • Add a project      → copy a block below under `projects` and edit it.
//  • Add a certificate  → copy a block under `certificates` and edit it.
//  • Change your info   → edit the fields under `personal`.
//  • Project images     → drop the image in `public/projects/` then set
//                         `image: "/projects/my-app.png"`. Optional.
//  • Certificate images → drop in `public/certificates/` then set
//                         `image: "/certificates/my-cert.png"`. Optional.
// ============================================================================

export type Project = {
  name: string;
  description: string;
  tags: string[];
  link: string; // live site / app link — opens when the card is clicked
  image?: string; // optional: "/projects/xxx.png"
  icon?: string; // optional: emoji or "/projects/xxx-icon.png"
};

export type Certificate = {
  name: string;
  issuer: string;
  year: string;
  image?: string; // optional: "/certificates/xxx.png"
  link?: string; // optional: issuer / credential website (shown as hyperlink on the CV)
};

export type Education = {
  degree: string;
  institution: string;
  years: string;
  details?: string;
  link?: string; // optional: institution website (shown as hyperlink on the CV)
};

export type Skill = {
  name: string;
  level: number; // 0 - 100
};

export type Personal = {
  photo: string; // profile photo, e.g. "/profile.jpg" (file lives in `public/`)
  name: string; // shown on the page (all caps style)
  shortName: string; // normal-case friendly name
  fullName: string; // used on the CV
  role: string;
  tagline: string;
  summary: string;
  email: string;
  phone: string; // display format
  whatsappNumber: string; // digits only, with country code, no "+" (for wa.me links)
  location: string;
  website: string;
  availability: string;
  github: string;
  linkedin: string;
  instagram: string;
};

// ----------------------------------------------------------------------------
//  🌍 PERSONAL INFO  —  edit everything below this line!
// ----------------------------------------------------------------------------
export const personal: Personal = {
  photo: "/profile.jpg", // ← replace the file in `public/` to change your photo
  name: "MUHAMMAD TASWAIB",
  shortName: "Muhammad Taswaib",
  fullName: "Muhammad Taswaib",

  role: "Generative AI Developer · CA Student",
  tagline:
    "Building AI-powered applications that turn smart ideas into practical, real-world solutions.",
  summary:
    "Aspiring finance professional and CA student at the Institute of Chartered Accountants of Pakistan (ICAP), with a growing interest in Generative AI and AI application development. Built and deployed AI powered applications using Streamlit, APIs, and prompt engineering. Developing practical skills in AI, data analytics, application development, and debugging — with an interest in applying technology to real business and finance-related processes.",
  email: "muhammadtaswaib0159@gmail.com",
  phone: "+92 341 9429291",
  whatsappNumber: "923419429291", // digits only, with country code
  location: "Karachi, Pakistan",
  website: "https://muhammad-taswaib-portfolio-7exa877ew-necklessboy0-4972.vercel.app", // live portfolio
  availability: "Open to AI, data & finance collaborations",

  github: "https://github.com/necklessboy0-cmd",
  linkedin: "https://www.linkedin.com/in/muhammad-taswaib-8757b52b9",
  instagram: "https://www.instagram.com/muhammadtaswaib",
};

// ----------------------------------------------------------------------------
//  🎓 EDUCATION
// ----------------------------------------------------------------------------
export const education: Education[] = [
  {
    degree: "CA — Chartered Accountancy (PRC · FTS-44 · CAF)",
    institution: "Institute of Chartered Accountants of Pakistan (ICAP)",
    years: "Ongoing",
    details: "PRC — FTS-44; CAF — 3 results awaited.",
    link: "https://icap.org.pk/",
  },
  {
    degree: "ADC-II — Accounting & Commerce",
    institution: "University of Karachi",
    years: "2025",
    details: "Result awaited.",
    link: "https://www.uok.edu.pk/",
  },
  {
    degree: "HSSC — Pre-Engineering",
    institution: "Bahria College Karsaz",
    years: "2021",
    details: "Grade A-1 (94%).",
    link: "https://www.bckz.edu.pk/",
  },
  {
    degree: "Matriculation (Science)",
    institution: "DHA SKBZ High School",
    years: "",
    details: "Grade A (79.06%).",
    link: "https://skbzcampus.dhacsskarachi.edu.pk/",
  },
];

// ----------------------------------------------------------------------------
//  💻 SKILLS
// ----------------------------------------------------------------------------
export const skills: Skill[] = [
  { name: "Generative AI", level: 88 },
  { name: "Prompt Engineering", level: 86 },
  { name: "AI Application Development", level: 82 },
  { name: "Streamlit", level: 88 },
  { name: "APIs", level: 82 },
  { name: "Data Analytics", level: 76 },
  { name: "Team Management", level: 78 },
  { name: "Communication", level: 86 },
  { name: "Problem Solving", level: 90 },
  { name: "Creativity", level: 88 },
  { name: "Leadership", level: 78 },
  { name: "Adaptability", level: 90 },
];

// ----------------------------------------------------------------------------
//  🚀 PROJECTS  —  your apps & websites. Clicking a card opens `link`.
//  The CV (PDF + TXT) auto-includes every project below. Nothing else to do! 🎉
// ----------------------------------------------------------------------------
export const projects: Project[] = [
  {
    name: "THUNDER",
    description:
      "AI-powered application built with Streamlit and Generative AI — deployed and available live.",
    tags: ["Streamlit", "Generative AI", "Python", "API"],
    link: "https://thunder-yoo9ildpztibs8t8u4fggd.streamlit.app/",
    image: "",
    icon: "⚡",
  },
  {
    name: "CV Analyzer",
    description:
      "AI-powered CV analysis application built with Streamlit that reviews and improves resumes.",
    tags: ["Streamlit", "Generative AI", "Python"],
    link: "https://cv-analyzer-lwhzhfnhzdsfdwdg6kpwpc.streamlit.app/",
    image: "",
    icon: "📄",
  },
  {
    name: "ResearchAssist",
    description:
      "An AI-powered research assistant web app that helps you gather and organize information quickly.",
    tags: ["Next.js", "React", "AI", "Tailwind"],
    link: "https://vercel-researchassist.vercel.app/",
    image: "",
    icon: "🤖",
  },
];

// ----------------------------------------------------------------------------
//  🏅 CERTIFICATIONS  —  click any card to open it.
// ----------------------------------------------------------------------------
export const certificates: Certificate[] = [
  {
    name: "Generative and Agentic AI",
    issuer: "ASPIRE Pakistan · Pak-Angels · HEC",
    year: "",
    image: "",
  },
  {
    name: "Web Development · Graphic Designing · Prompt Engineering",
    issuer: "SACTANX",
    year: "",
    image: "",
    link: "https://sactanx.com/",
  },
  {
    name: "Personal Presentation and Effectiveness",
    issuer: "Al-Hamd Institute",
    year: "",
    image: "",
  },
  {
    name: "MS Office",
    issuer: "Al-Hamd Institute",
    year: "",
    image: "",
  },
  {
    name: "Inter-School Olympia",
    issuer: "Pak-Turk School",
    year: "",
    image: "",
  },
];

// ----------------------------------------------------------------------------
//  🤖 CHATBOT — quick suggestion chips shown in the assistant
// ----------------------------------------------------------------------------
export const quickQuestions: string[] = [
  "Who is Muhammad Taswaib?",
  "What are your skills?",
  "Show me your projects",
  "Where did you study?",
  "What is your education?",
  "Show your certificates",
  "How do I contact you?",
];