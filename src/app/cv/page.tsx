import Link from "next/link";
import type { Metadata } from "next";
import { personal } from "@/data/resume";
import CvDownload from "@/components/CvDownload";
import CvPaginated from "@/components/CvPaginated";

export const metadata: Metadata = {
  title: `CV — ${personal.name}`,
  description: personal.tagline,
};

export default function CvPage() {
  const p = personal;

  return (
    <section className="mx-auto max-w-5xl px-5 pb-24 pt-28">
      <div className="no-print mx-auto mb-8 max-w-3xl text-center">
        <p className="font-display text-xs uppercase tracking-[0.4em] text-fuchsia-300">
          Curriculum Vitae
        </p>
        <h1 className="mt-2 font-name text-3xl font-bold italic text-white sm:text-4xl">
          {p.fullName}
        </h1>
        <p className="mt-3 text-sm text-nebula-300/80">
          The CV flows onto as many A4 pages as it needs — generated from the
          same data as the website, so add a project and it appears here
          automatically.
        </p>
        <div className="mt-6">
          <CvDownload sheetId="cv-sheet" />
        </div>
        <div className="mt-8">
          <Link
            href="/#projects"
            className="text-xs font-semibold uppercase tracking-[0.25em] text-nebula-300/70 transition-colors hover:text-fuchsia-300"
          >
            ← Back to portfolio
          </Link>
        </div>
      </div>

      {/* ATS-friendly printable sheet (auto-paginated into A4 pages) */}
      <CvPaginated />

      <p className="no-print mt-6 text-center text-xs text-nebula-300/50">
        Tip: for maximum ATS compatibility use the .TXT download (clean text).
        PDF is a styled print-out of the same pages; Print preserves page
        breaks.
      </p>
    </section>
  );
}