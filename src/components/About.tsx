"use client";

import { personal } from "@/data/resume";
import Reveal from "./Reveal";
import SectionHeading from "./SectionHeading";

export default function About() {
  const facts: { label: string; value: string; href?: string }[] = [
    { label: "Name", value: personal.shortName },
    { label: "Location", value: personal.location },
    { label: "Email", value: personal.email, href: `mailto:${personal.email}` },
    { label: "Status", value: personal.availability },
  ];

  return (
    <section id="about" className="relative mx-auto max-w-6xl scroll-mt-20 px-6 py-24">
      <SectionHeading
        kicker="About"
        title="WHO I AM"
        sub="A quick look at the person behind the pixels."
      />

      <div className="grid items-center gap-12 md:grid-cols-[320px_1fr]">          <Reveal className="mx-auto w-full max-w-xs">
            <div className="relative">
              <div className="absolute -inset-3 rounded-3xl bg-gradient-to-tr from-nebula-600 via-fuchsia-500 to-nebula-400 opacity-60 blur-lg animate-pulse-glow" />
              <div className="relative aspect-square overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-space-800 to-space-950">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={personal.photo}
                  alt={personal.name}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </Reveal>

        <div>
          <Reveal delay={0.1}>
            <h3 className="font-name text-3xl font-bold italic text-white">
              {personal.shortName}
            </h3>
          </Reveal>
          <Reveal delay={0.18}>
            <p className="mt-5 text-base leading-relaxed text-nebula-300/85">
              {personal.summary}
            </p>
          </Reveal>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {facts.map((f, i) => (
              <Reveal key={f.label} delay={0.2 + i * 0.08}>
                <div className="card-glass rounded-2xl px-5 py-4">
                  <p className="font-display text-[10px] font-semibold uppercase tracking-[0.3em] text-fuchsia-300">
                    {f.label}
                  </p>
                  <p className="mt-1.5 break-all text-sm text-nebula-300">
                    {f.href ? (
                      <a
                        href={f.href}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="transition-colors hover:text-fuchsia-300"
                      >
                        {f.value}
                      </a>
                    ) : (
                      f.value
                    )}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}