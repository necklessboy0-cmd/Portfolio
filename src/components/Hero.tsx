"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { personal } from "@/data/resume";
import SocialLinks from "./SocialLinks";
import { ChevronDownIcon, DownloadIcon, SparklesIcon } from "./icons";

function scrollToId(id: string) {
  const el = document.querySelector(id) as HTMLElement | null;
  if (!el) return;
  if (window.__lenis) {
    window.__lenis.scrollTo(el, { offset: -56, duration: 1.2 });
  } else {
    el.scrollIntoView({ behavior: "smooth" });
  }
}

export default function Hero() {
  return (
    <section
      id="top"
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pt-24"
    >
      {/* floating nebula orbs (static — animated blur is GPU-expensive) */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-24 h-80 w-80 rounded-full bg-nebula-600/25 blur-[110px]" />
        <div className="absolute right-[-10%] top-1/3 h-96 w-96 rounded-full bg-fuchsia-600/20 blur-[120px]" />
        <div className="absolute bottom-10 left-1/3 h-72 w-72 rounded-full bg-purple-800/25 blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex flex-col items-center text-center"
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-4 py-1.5 text-xs font-medium tracking-widest text-fuchsia-200">
          <SparklesIcon size={14} />
          {personal.availability}
        </span>

        <div className="mt-8 flex flex-col items-center gap-5 sm:flex-row sm:gap-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative shrink-0"
          >
            <div className="absolute -inset-2 rounded-full bg-gradient-to-tr from-nebula-600 via-fuchsia-500 to-nebula-400 opacity-60 blur-lg animate-pulse-glow" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={personal.photo}
              alt={personal.name}
              className="relative h-28 w-28 rounded-full border-2 border-white/20 object-cover shadow-2xl sm:h-32 sm:w-32 md:h-40 md:w-40"
            />
          </motion.div>

          <h1 className="font-name text-[13vw] font-bold italic leading-[0.95] tracking-tight text-center sm:text-left sm:text-6xl md:text-7xl lg:text-[6rem]">
            <span className="block text-gradient text-glow drop-shadow-[0_10px_45px_rgba(168,85,247,0.35)]">
              {personal.name.split(" ")[0]}
            </span>
            <span className="mt-1 block text-gradient text-glow">
              {personal.name.split(" ")[1]}
            </span>
          </h1>
        </div>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.7 }}
          className="mt-7 font-display text-sm font-semibold uppercase tracking-[0.35em] text-nebula-300 sm:text-base"
        >
          {personal.role}
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.7 }}
          className="mt-5 max-w-2xl text-base leading-relaxed text-nebula-300/80 sm:text-lg"
        >
          {personal.tagline}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.7 }}
          className="mt-9 flex flex-wrap items-center justify-center gap-4"
        >
          <button
            onClick={() => scrollToId("#projects")}
            className="btn-primary inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold uppercase tracking-wider text-white"
          >
            View Projects
            <ChevronDownIcon size={16} />
          </button>
          <Link
            href="/cv"
            className="btn-ghost inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold uppercase tracking-wider text-white"
          >
            <DownloadIcon size={16} className="text-fuchsia-300" />
            Download CV
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.85, duration: 0.8 }}
          className="mt-12"
        >
          <SocialLinks size={22} />
        </motion.div>
      </motion.div>

      {/* scroll cue */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 1 }}
        onClick={() => scrollToId("#about")}
        aria-label="Scroll down"
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-nebula-300/70 transition-colors hover:text-fuchsia-300"
      >
        <motion.span
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
          className="flex flex-col items-center gap-2"
        >
          <span className="rounded-full border border-white/15 p-2.5">
            <ChevronDownIcon size={18} />
          </span>
        </motion.span>
      </motion.button>
    </section>
  );
}