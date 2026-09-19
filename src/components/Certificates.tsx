"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { certificates, type Certificate } from "@/data/resume";
import CountUp from "./CountUp";
import Reveal from "./Reveal";
import SectionHeading from "./SectionHeading";

function CertificateCard({
  cert,
  index,
  onOpen,
}: {
  cert: Certificate;
  index: number;
  onOpen: () => void;
}) {
  return (
    <div className="card-glass card-glass-hover group flex h-full items-center gap-6 rounded-3xl p-7">
      <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border border-nebula-400/25 bg-nebula-500/10">
        <span className="font-display text-5xl font-black text-gradient">
          <CountUp target={index + 1} duration={900} />
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="font-name text-xl font-bold italic leading-snug text-white sm:text-2xl">
          {cert.name}
        </h3>
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-nebula-400">
          {cert.issuer} · {cert.year}
        </p>
        <button
          onClick={onOpen}
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-fuchsia-200 transition-colors group-hover:border-fuchsia-400/70 group-hover:bg-fuchsia-500/20"
        >
          View certificate →
        </button>
      </div>
    </div>
  );
}

export default function Certificates() {
  const [selected, setSelected] = useState<Certificate | null>(null);
  const total = certificates.length;

  return (
    <section
      id="certificates"
      className="relative mx-auto max-w-6xl scroll-mt-20 px-6 py-24"
    >
      <SectionHeading
        kicker="Certificates"
        title="CERTIFICATIONS"
        sub="Achievements that mark milestones along the journey. Click any certificate to open it."
      />

      <div className="grid gap-6 md:grid-cols-2">
        {certificates.map((c, i) => (
          <Reveal key={c.name} delay={(i % 2) * 0.1} className="h-full">
            <CertificateCard
              cert={c}
              index={i}
              onOpen={() => setSelected(c)}
            />
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.12} className="mt-8 text-center">
        <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.25em] text-nebula-300/80">
          🏅 {total} certification{total === 1 ? "" : "s"} and counting
        </p>
      </Reveal>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-space-950/85 p-5 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.88, y: 24, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.92, y: 12, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-nebula-400/25 bg-space-900 shadow-[0_40px_120px_-30px_rgba(124,58,237,0.7)]"
            >
              <div className="relative flex h-60 items-center justify-center bg-gradient-to-br from-space-800 via-space-900 to-fuchsia-950/50">
                {selected.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selected.image}
                    alt={selected.name}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="text-8xl">🏅</span>
                )}
                <button
                  aria-label="Close"
                  onClick={() => setSelected(null)}
                  className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-space-950/70 text-white transition-colors hover:border-fuchsia-400 hover:text-fuchsia-300"
                >
                  ✕
                </button>
              </div>
              <div className="p-7">
                <p className="font-display text-[11px] font-semibold uppercase tracking-[0.3em] text-fuchsia-300">
                  {selected.issuer} · {selected.year}
                </p>
                <h3 className="mt-2 font-name text-2xl font-bold italic text-white">
                  {selected.name}
                </h3>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}