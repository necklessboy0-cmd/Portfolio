"use client";

import { personal } from "@/data/resume";
import Reveal from "./Reveal";
import SectionHeading from "./SectionHeading";
import SocialLinks from "./SocialLinks";
import { MailIcon, RocketIcon, WhatsAppIcon } from "./icons";

export default function Contact() {
  return (
    <section
      id="contact"
      className="relative mx-auto max-w-6xl scroll-mt-20 px-6 py-24"
    >
      <SectionHeading
        kicker="Contact"
        title="SAY HELLO"
        sub="Have an idea, a project, or just want to talk tech? My inbox is open."
      />

      <Reveal className="mx-auto max-w-3xl">
        <div className="card-glass relative overflow-hidden rounded-3xl p-8 sm:p-10">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-fuchsia-600/20 blur-[90px]" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-nebula-600/25 blur-[90px]" />

          <div className="relative grid gap-5 sm:grid-cols-2">
            <a
              href={`mailto:${personal.email}`}
              className="btn-ghost group flex items-center gap-4 rounded-2xl p-5"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-nebula-400/30 bg-nebula-500/10 text-fuchsia-300">
                <MailIcon size={22} />
              </span>
              <span>
                <span className="block font-display text-[11px] font-semibold uppercase tracking-[0.25em] text-nebula-300">
                  Email me
                </span>
                <span className="break-all text-sm text-white">
                  {personal.email}
                </span>
              </span>
            </a>

            <a
              href={`https://wa.me/${personal.whatsappNumber}`}
              target="_blank"
              rel="noreferrer noopener"
              className="btn-ghost group flex items-center gap-4 rounded-2xl p-5"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-nebula-400/30 bg-nebula-500/10 text-fuchsia-300">
                <WhatsAppIcon size={22} />
              </span>
              <span>
                <span className="block font-display text-[11px] font-semibold uppercase tracking-[0.25em] text-nebula-300">
                  WhatsApp
                </span>
                <span className="text-sm text-white">{personal.phone}</span>
              </span>
            </a>
          </div>

          <div className="relative mt-9 flex flex-col items-center gap-5">
            <p className="font-display text-xs font-semibold uppercase tracking-[0.35em] text-nebula-300">
              Find me on
            </p>
            <SocialLinks size={22} />
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-nebula-300/60">
              <RocketIcon size={14} className="text-fuchsia-300" />
              {personal.availability}
            </p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}