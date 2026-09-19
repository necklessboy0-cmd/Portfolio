"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { skills } from "@/data/resume";
import Reveal from "./Reveal";
import SectionHeading from "./SectionHeading";

function SkillBar({ name, level, index }: { name: string; level: number; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });

  return (
    <div ref={ref} className="card-glass rounded-2xl p-5">
      <div className="flex items-end justify-between">
        <p className="font-name text-base font-semibold italic text-white">
          {name}
        </p>
        <p className="font-display text-sm font-bold text-fuchsia-300">
          {level}%
        </p>
      </div>
      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white/10">
        <motion.div
          initial={{ width: "0%" }}
          animate={inView ? { width: `${level}%` } : {}}
          transition={{
            duration: 1.2,
            delay: 0.15 + index * 0.08,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="h-full rounded-full bg-gradient-to-r from-nebula-600 via-fuchsia-500 to-fuchsia-300"
        />
      </div>
    </div>
  );
}

export default function Skills() {
  return (
    <section id="skills" className="relative mx-auto max-w-6xl scroll-mt-20 px-6 py-24">
      <SectionHeading
        kicker="Skills"
        title="MY SUPER POWERS"
        sub="Technologies and tools I use to bring ideas to life."
      />

      <div className="grid gap-5 sm:grid-cols-2">
        {skills.map((s, i) => (
          <Reveal key={s.name} delay={i * 0.06}>
            <SkillBar name={s.name} level={s.level} index={i} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}