"use client";

import { useResume } from "./ResumeProvider";
import type { CustomSection, SectionItem } from "@/data/resume";
import Reveal from "./Reveal";
import SectionHeading from "./SectionHeading";

function SectionItemCard({ item }: { item: SectionItem }) {
  return (
    <Reveal className="h-full">
      <div className="card-glass card-glass-hover h-full rounded-3xl p-6">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-name text-lg font-bold italic leading-snug text-white">
            {item.link ? (
              <a href={item.link} target="_blank" rel="noreferrer noopener" className="transition-colors hover:text-fuchsia-300">
                {item.title}
              </a>
            ) : (
              item.title
            )}
          </h3>
          {item.link && (
            <a
              href={item.link}
              target="_blank"
              rel="noreferrer noopener"
              aria-label={`Open ${item.title}`}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-nebula-400/30 bg-nebula-500/10 text-fuchsia-300 transition-all duration-300 hover:border-fuchsia-400/70 hover:bg-fuchsia-500/20 hover:text-white"
            >
              ↗
            </a>
          )}
        </div>
        {(item.subtitle || item.year) && (
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-nebula-400">
            {[item.subtitle, item.year].filter(Boolean).join(" · ")}
          </p>
        )}
        {item.description && (
          <p className="mt-3 text-sm leading-relaxed text-nebula-300/80">{item.description}</p>
        )}
      </div>
    </Reveal>
  );
}

function ItemGrid({ items }: { items: SectionItem[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {items.map((item) => (
        <SectionItemCard key={item.id} item={item} />
      ))}
    </div>
  );
}

export default function CustomSections() {
  const data = useResume();
  const experience = data.experience ?? [];
  const courses = data.courses ?? [];
  const sections = (data.sections ?? []).filter((s: CustomSection) => s.items.length > 0);

  if (experience.length === 0 && courses.length === 0 && sections.length === 0) {
    return null;
  }

  return (
    <>
      {experience.length > 0 && (
        <section id="experience" className="relative mx-auto max-w-6xl scroll-mt-20 px-6 py-24">
          <SectionHeading
            kicker="Experience"
            title="WHERE I'VE WORKED"
            sub="Practical experience along the way."
          />
          <ItemGrid items={experience} />
        </section>
      )}

      {courses.length > 0 && (
        <section id="courses" className="relative mx-auto max-w-6xl scroll-mt-20 px-6 py-24">
          <SectionHeading
            kicker="Courses"
            title="COURSES & TRAINING"
            sub="Structured learning beyond formal education."
          />
          <ItemGrid items={courses} />
        </section>
      )}

      {sections.map((sec) => (
        <section
          key={sec.id}
          id={sec.id}
          className="relative mx-auto max-w-6xl scroll-mt-20 px-6 py-24"
        >
          <SectionHeading
            kicker={sec.title}
            title={sec.title.toUpperCase()}
            sub=""
          />
          <ItemGrid items={sec.items} />
        </section>
      ))}
    </>
  );
}
