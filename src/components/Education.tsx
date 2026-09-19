"use client";

import { education } from "@/data/resume";
import Reveal from "./Reveal";
import SectionHeading from "./SectionHeading";
import { GraduationIcon } from "./icons";

export default function Education() {
  return (
    <section
      id="education"
      className="relative mx-auto max-w-6xl scroll-mt-20 px-6 py-24"
    >
      <SectionHeading
        kicker="Education"
        title="WHERE I STUDIED"
        sub="My learning journey that built my foundation."
      />

      <div className="relative space-y-8 before:absolute before:left-[27px] before:top-4 before:h-[calc(100%-2rem)] before:w-px before:bg-gradient-to-b before:from-nebula-500/60 before:via-fuchsia-500/40 before:to-transparent md:before:left-1/2 md:before:-translate-x-1/2">
        {education.map((edu, i) => (
          <Reveal key={edu.degree} delay={i * 0.12}>
            <div className="relative flex gap-5 md:w-1/2 md:odd:pr-14 md:even:ml-auto md:even:pl-14">
              <div className="relative z-10 mt-1 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-nebula-400/30 bg-space-800 text-fuchsia-300">
                <GraduationIcon size={26} />
              </div>
              <div className="card-glass card-glass-hover flex-1 rounded-2xl p-6">
                <p className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-fuchsia-300">
                  {edu.years}
                </p>
                <h3 className="mt-2 font-name text-xl font-bold italic text-white">
                  {edu.degree}
                </h3>
                <p className="mt-1 text-sm font-medium text-nebula-400">
                  {edu.institution}
                </p>
                {edu.details && (
                  <p className="mt-3 text-sm leading-relaxed text-nebula-300/80">
                    {edu.details}
                  </p>
                )}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}