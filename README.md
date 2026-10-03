# 🚀 Portfolio — MUHAMMAD TASWAIB

A dark-purple, space-themed personal portfolio built with **Next.js (TypeScript)** and **Tailwind CSS**.

## ✨ Features

- **Nebula design** — deep purple gradient from the sides fading toward a dark center, animated star field with shooting stars.
- **Animated hero** — your name in bold italic in a futuristic display font, with smooth scroll animations everywhere.
- **Smooth scrolling** — buttery Lenis smooth-scroll with scroll-reveal animations (`Framer Motion`).
- **Projects** — beautiful cards (name + icon/thumbnail + description + tags). Clicking a card opens the **live app/website**.
- **CV that auto-updates** — the CV (PDF + ATS `.TXT`) is generated from the **same data file** as the site. Add a project → it appears in the CV automatically.
- **ATS-friendly CV** — clean `.TXT` download plus a styled PDF and a print-optimized page.
- **Certificates** — clicks open each certificate; a big number counts up (1 → 2 → 3…) when you scroll to the section.
- **AI assistant chatbot** — answers questions about the CV, projects, skills, education, certificates and contact info, entirely locally from your data (no API key needed).
- **Social logos only** — GitHub, LinkedIn, Instagram, WhatsApp. Tapping a logo opens your profile directly.
- **Easy to update** — everything lives in one file: `src/data/resume.ts`.
- **Word CV importer** — visit `/import`, drop your `.docx` CV, and the tool generates the `resume.ts` code for you (parsed fully in your browser).

---

## 🚀 Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

Production build + type-check:

```bash
npm run build
npm run lint
```

---

## ✏️ Update your content (all in ONE file)

Edit **`src/data/resume.ts`**. The whole site, the CV, the chatbot — all read from here.

### Personal info
```ts
export const personal: Personal = {
  name: "MUHAMMAD TASWAIB",
  email: "your.email@gmail.com",
  phone: "+92 300 0000000",
  whatsappNumber: "923000000000",   // digits only, with country code, no "+"
  github: "https://github.com/you",
  linkedin: "https://www.linkedin.com/in/you",
  instagram: "https://www.instagram.com/you",
  // ...
};
```

### Add a project
Copy one block in `projects: Project[]`, for example:

```ts
{
  name: "My New App",
  description: "What it does.",
  tags: ["Next.js", "Tailwind", "API"],
  link: "https://my-app.vercel.app",   // ← live link (opens on click)
  image: "/projects/my-app.png",        // optional thumbnail
  icon: "🚀",                           // optional emoji / icon path
},
```

The project then appears on the site **and** in the CV — automatically.

### Add a certificate
```ts
{
  name: "My Certificate",
  issuer: "Academy Name",
  year: "2025",
  image: "/certificates/my-cert.png",  // optional
},
```

### Add a skill
```ts
{ name: "TypeScript", level: 90 },  // level 0–100
```

---

## 📥 Import a Word (.docx) CV

1. Go to **`/import`** (or click the import link while running locally).
2. Drag & drop your **`.docx`** (or `.txt`) CV.
3. Review what was detected (name, email, phone, socials, education, skills, projects, certificates).
4. **Copy `resume.ts`** → paste over the 5 blocks in `src/data/resume.ts`.
5. Save — the site, the CV and the chatbot update instantly.

Everything is parsed **in your browser** — your document is never uploaded anywhere.

---

## 🖼️ Images

Drop project thumbnails into `public/projects/` and certificate images into `public/certificates/`, then reference them as `/projects/name.png` in the data file. If no image is set, a nice gradient placeholder is shown instead.

---

## 📄 The CV

- **Page:** `/cv` — downloadable, printable, ATS-friendly.
- **Buttons:** `Download PDF` (styled), `Download ATS .TXT` (clean text, best for ATS), `Print / Save as PDF`.
- **Auto-update:** the CV is generated from `src/data/resume.ts`. Any project/certificate you add is instantly included in every format. No extra step. 🎉

---

## 🤖 AI assistant

A floating chatbot (bottom-right). It answers questions by matching keywords against the same data file — education, skills, projects (with live links), certificates, contact info, CV download.

To tweak how it answers, edit `src/lib/chatEngine.ts`. To change the suggested questions, edit `quickQuestions` in `src/data/resume.ts`.

---

## 💜 Deployment on Vercel

1. Push this folder to a GitHub repository.
2. Go to https://vercel.com and click **Add New → Project**.
3. Import your repo — Vercel auto-detects Next.js.
4. Deploy. Done.

Deploy from CLI instead:

```bash
npm i -g vercel
vercel
```

> No environment variables or API keys are required. Everything runs client-side/static.

---

## 🎨 Design notes / customization

- **Fonts** (Google): `Orbitron` (display/headings), `Chakra Petch` (your name — bold italic), `Space Grotesk` (body).
  Change them in `src/app/layout.tsx`.
- **Colors**: defined as Tailwind theme tokens in `src/app/globals.css` (`--color-space-*`, `--color-nebula-*`).
- **Sections** live in `src/components/` (`Hero`, `About`, `Education`, `Skills`, `Projects`, `Certificates`, `Contact`, `Footer`, `Chatbot`).

## 📁 Project structure

```
src/
├─ app/
│  ├─ layout.tsx          # root layout, fonts, global providers
│  ├─ page.tsx            # home page (all sections)
│  ├─ globals.css         # Tailwind theme + custom styles
│  ├─ cv/page.tsx         # printable CV page
│  └─ api/resume.txt/route.ts  # ATS .TXT endpoint
├─ components/            # UI sections, chatbot, starfield, social icons…
├─ lib/
│  ├─ chatEngine.ts       # AI assistant logic
│  └─ cv.ts               # CV text generator
└─ data/
   └─ resume.ts           # ⭐ ALL YOUR CONTENT
```