// ============================================================================
//  ⚡  DATA LOADER — typed access to the single source of truth:
//  src/data/resume-data.json
//
//  The private /admin assistant edits that JSON file (in dev it writes the
//  file directly; in production it commits to GitHub, which triggers an
//  automatic Vercel redeploy). Everything on the site — hero, sections, CV,
//  chatbot — reads from it, so one confirmed edit in /admin updates it all.
// ============================================================================

import raw from "./resume-data.json";

// ------------------------------- types --------------------------------------

export type Project = {
  name: string;
  description: string;
  tags: string[];
  link: string;
  image?: string;
  icon?: string;
};

export type Certificate = {
  name: string;
  issuer: string;
  year: string;
  image?: string;
  link?: string; // credential / issuer website — shown as a clickable hyperlink
};

export type Education = {
  degree: string;
  institution: string;
  years: string;
  details?: string;
  link?: string;
};

export type Skill = {
  name: string;
  level: number; // 0 - 100
};

export type SectionItem = {
  id: string;
  title: string;
  subtitle?: string;
  year?: string;
  description?: string;
  link?: string;
  skills?: string[];
};

// Generic section the admin can create via the assistant (e.g. "Courses",
// "Experience", "Awards") — rendered on the site & CV when non-empty.
export type CustomSection = {
  id: string;
  title: string;
  items: SectionItem[];
};

export type Personal = {
  photo: string;
  name: string;
  shortName: string;
  fullName: string;
  role: string;
  tagline: string;
  summary: string;
  email: string;
  phone: string;
  whatsappNumber: string;
  location: string;
  website: string;
  availability: string;
  github: string;
  linkedin: string;
  instagram: string;
};

export type ResumeData = {
  personal: Personal;
  education: Education[];
  skills: Skill[];
  projects: Project[];
  certificates: Certificate[];
  courses: SectionItem[];
  experience: SectionItem[];
  sections: CustomSection[];
  languages: string[];
  interests: string[];
  quickQuestions: string[];
};

// ------------------------------ loader --------------------------------------

export const resumeData: ResumeData = raw as unknown as ResumeData;

export const personal: Personal = resumeData.personal;
export const education: Education[] = resumeData.education;
export const skills: Skill[] = resumeData.skills;
export const projects: Project[] = resumeData.projects;
export const certificates: Certificate[] = resumeData.certificates;
export const courses: SectionItem[] = resumeData.courses ?? [];
export const experience: SectionItem[] = resumeData.experience ?? [];
export const customSections: CustomSection[] = resumeData.sections ?? [];
export const languages: string[] = resumeData.languages ?? [];
export const interests: string[] = resumeData.interests ?? [];
export const quickQuestions: string[] = resumeData.quickQuestions ?? [];
