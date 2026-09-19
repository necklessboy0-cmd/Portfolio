"use client";

import Reveal from "./Reveal";

export default function SectionHeading({
  kicker,
  title,
  sub,
}: {
  kicker: string;
  title: string;
  sub?: string;
}) {
  return (
    <Reveal className="mx-auto mb-14 max-w-2xl text-center">
      <p className="font-display text-xs font-semibold uppercase tracking-[0.4em] text-fuchsia-300">
        {kicker}
      </p>
      <h2 className="mt-3 font-display text-3xl font-bold tracking-wide text-white sm:text-4xl">
        {title}
      </h2>
      {sub && (
        <p className="mt-4 text-base leading-relaxed text-nebula-300/75">
          {sub}
        </p>
      )}
    </Reveal>
  );
}