import type { Metadata } from "next";
import Link from "next/link";
import { personal } from "@/data/resume";
import CvImporter from "@/components/CvImporter";

export const metadata: Metadata = {
  title: `Import CV — ${personal.name}`,
  description: "Import a Word (.docx) document and generate resume.ts",
  robots: { index: false, follow: false },
};

export default function ImportPage() {
  return (
    <section className="mx-auto max-w-5xl px-6 pb-24 pt-28">
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <p className="font-display text-xs uppercase tracking-[0.4em] text-fuchsia-300">
          Import Tool
        </p>
        <h1 className="mt-2 font-name text-3xl font-bold italic text-white sm:text-4xl">
          Import your Word CV
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-nebula-300/80">
          Drop your <strong className="text-white">.docx</strong> CV here. The
          tool reads it in your browser, finds your contact details, education,
          skills, projects and certificates, then generates the code you paste
          into <code className="text-fuchsia-300">src/data/resume.ts</code>{" "}
          once. From then on, everything stays in sync automatically.
        </p>
        <Link
          href="/"
          className="mt-5 inline-block text-xs font-semibold uppercase tracking-[0.25em] text-nebula-300/70 transition-colors hover:text-fuchsia-300"
        >
          ← Back to portfolio
        </Link>
      </div>

      <CvImporter />
    </section>
  );
}