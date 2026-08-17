import React from 'react';

export function UserHomepage(): React.JSX.Element {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <section className="overflow-hidden rounded-3xl border border-white/10 bg-brand-dark px-6 py-10 shadow-xl shadow-black/5 sm:px-10 sm:py-14 lg:px-14 lg:py-16">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-red">
            Built by the 1BT community
          </p>
          <h1 className="mt-5 font-display text-4xl font-bold tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">
            Latest from the team.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
            Ideas, lessons and conversations worth sharing.
          </p>
        </div>
      </section>

      <section className="py-10 sm:py-12" aria-labelledby="latest-updates-heading">
        <h2
          id="latest-updates-heading"
          className="font-display text-2xl font-bold tracking-[-0.03em] text-brand-text-primary sm:text-3xl"
        >
          Latest updates
        </h2>
        <div
          className="mt-6 min-h-40 rounded-2xl border border-dashed border-brand-border bg-brand-surface"
          aria-label="Latest updates content area"
        />
      </section>
    </div>
  );
}
