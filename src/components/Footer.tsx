"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { personal } from "@/data/resume";

export default function Footer() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end end"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [60, 0]);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [0, 1]);

  return (
    <footer
      ref={ref}
      className="relative mt-10 overflow-hidden border-t border-white/10"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-space-900/60 to-space-950" />

      <motion.div style={{ y, opacity }} className="relative px-6 py-16 text-center">
        <p className="font-display text-[10px] font-semibold uppercase tracking-[0.5em] text-nebula-300">
          Developed with passion by
        </p>

        <p className="mt-4 font-name text-4xl font-bold italic text-gradient text-glow sm:text-5xl md:text-6xl">
          {personal.name}
        </p>

        <p className="mt-4 text-sm text-nebula-300/70">
          {personal.role} · {personal.location}
        </p>

        <div className="mx-auto mt-8 flex max-w-xs items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-nebula-300/50">
          <span className="h-px flex-1 bg-white/15" />
          {personal.name.split(" ")[0]} © {new Date().getFullYear()}
          <span className="h-px flex-1 bg-white/15" />
        </div>
      </motion.div>
    </footer>
  );
}