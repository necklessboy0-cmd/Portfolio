"use client";

import { projects } from "@/data/resume";
import { motion } from "motion/react";
import Reveal from "./Reveal";
import SectionHeading from "./SectionHeading";
import { ExternalLinkIcon, RocketIcon } from "./icons";

function ProjectCard({ project }: { project: (typeof projects)[number] }) {
  const hasImage = Boolean(project.image);
  const tagLine = (array: string[]) => array.map((t) => t.trim()).join(" · ");

  return (
    <motion.a
      href={project.link}
      target="_blank"
      rel="noreferrer noopener"
      whileHover={{ y: -8 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="card-glass group relative flex h-full flex-col overflow-hidden rounded-3xl"
    >
      <div className="flex items-center gap-1.5 border-b border-white/10 px-5 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-300/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
        <span className="ml-3 flex-1 truncate rounded-full bg-white/5 px-3 py-1 text-[11px] text-nebula-300/60">
          {project.link.replace(/^https?:\/\//, "")}
        </span>
      </div>

      <div className="relative h-44 shrink-0 overflow-hidden">
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.image}
            alt={`${project.name} preview`}
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-space-800 via-space-900 to-fuchsia-950/60">
            <span className="text-6xl drop-shadow-[0_8px_30px_rgba(168,85,247,0.45)] transition-transform duration-700 ease-out group-hover:scale-125">
              {project.icon || "🚀"}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-space-950/80 to-transparent" />
      </div>

      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-name text-2xl font-bold italic text-white">
            {project.name}
          </h3>
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-nebula-400/30 bg-nebula-500/10 text-fuchsia-300 transition-all duration-300 group-hover:rotate-45 group-hover:border-fuchsia-400/70 group-hover:bg-fuchsia-500/20 group-hover:text-white">
            <ExternalLinkIcon size={18} />
          </span>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-nebula-300/80">
          {project.description}
        </p>

        <p className="mt-5 font-display text-[10px] font-semibold uppercase tracking-[0.2em] text-fuchsia-300/90">
          {tagLine(project.tags)}
        </p>

        <span className="mt-auto pt-5 text-xs font-bold uppercase tracking-[0.2em] text-nebula-300/50 transition-colors group-hover:text-fuchsia-300">
          Open project →
        </span>
      </div>
    </motion.a>
  );
}

export default function Projects() {
  return (
    <section
      id="projects"
      className="relative mx-auto max-w-6xl scroll-mt-20 px-6 py-24"
    >
      <SectionHeading
        kicker="Portfolio"
        title="SELECTED PROJECTS"
        sub="Click any card to open the live app or website."
      />

      <div className="grid gap-7 sm:grid-cols-2">
        {projects.map((p, i) => (
          <Reveal key={p.name} delay={(i % 2) * 0.1} className="h-full">
            <ProjectCard project={p} />
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.15} className="mt-12 text-center">
        <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm text-nebula-300/80">
          <RocketIcon size={16} className="text-fuchsia-300" />
          More projects are launched all the time — check the chatbot or GitHub for the latest.
        </p>
      </Reveal>
    </section>
  );
}