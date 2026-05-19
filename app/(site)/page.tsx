import type { Metadata } from "next";
import Link from "next/link";
import {
  getComingSoonMovies,
  getHomepageFeaturedMovies,
  getTheaters,
} from "@/lib/data";
import { APP_NAME } from "@/lib/config";

export const metadata: Metadata = {
  title: "Home",
  description: `Discover now playing films, coming soon titles, and historic movie houses across ${APP_NAME}.`,
  openGraph: {
    title: APP_NAME,
    description: `Discover now playing films, coming soon titles, and historic movie houses across ${APP_NAME}.`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: APP_NAME,
    description: `Discover now playing films, coming soon titles, and historic movie houses across ${APP_NAME}.`,
  },
};

export default async function HomePage() {
  const [homepageFeaturedMovies, comingSoon, theaters] = await Promise.all([
    getHomepageFeaturedMovies(),
    getComingSoonMovies(),
    getTheaters(),
  ]);

  const [featured, secondary] = homepageFeaturedMovies;

  return (
    <div className="bg-[#131313] text-[#e5e2e1]">
      {/* ── Hero — uses featured film ── */}
      <section className="relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={featured?.backdrop}
          alt={featured?.title ?? "Cinema interior"}
          className="absolute inset-0 h-full w-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#131313]/60 via-transparent to-[#131313]" />

        <div className="relative mx-auto max-w-7xl px-6 py-32 lg:px-8 lg:py-48">
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-[#ffbf00]">
            Now Playing
          </p>
          <h1 className="mt-4 max-w-3xl font-serif text-6xl font-normal leading-tight text-[#e5e2e1] lg:text-8xl">
            {featured?.title}
          </h1>
          <p className="mt-6 max-w-xl font-sans text-base leading-7 text-[#d4c5ab]">
            {featured?.tagline} Now screening at both locations.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href={`/movie/${featured?.slug}`}
              className="rounded-[0.125rem] bg-[#ffbf00] px-6 py-3 font-sans text-sm font-semibold uppercase tracking-widest text-[#402d00] transition-colors hover:bg-[#fbbc00]"
            >
              Get Tickets
            </Link>
            <Link
              href="/showtimes"
              className="rounded-[0.125rem] px-6 py-3 font-sans text-sm font-semibold uppercase tracking-widest text-[#ffe2ab] transition-colors hover:text-[#ffbf00]"
            >
              All Showtimes
            </Link>
          </div>
        </div>
      </section>

      {/* ── Current Engagements ── */}
      <section className="bg-[#1c1b1b] py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-[#9c8f78]">
            Current Engagements
          </p>
          <h2 className="mt-3 font-serif text-4xl text-[#e5e2e1]">
            On Screen Now
          </h2>

          {/* Asymmetric grid: 60/40 */}
          <div className="mt-12 grid gap-0 lg:grid-cols-5">
            {/* Featured film — 60% */}
            {featured && (
              <article className="lg:col-span-3 bg-[#201f1f] p-8 lg:p-12">
                <div className="flex gap-3 items-center mb-6">
                  <span className="rounded-[0.125rem] bg-[#a0030e] px-2 py-0.5 font-sans text-xs font-semibold uppercase tracking-wider text-[#ffa99f]">
                    Now Playing
                  </span>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={featured.poster}
                  alt={`${featured.title} poster`}
                  className="h-72 w-full object-cover rounded-[0.125rem]"
                />
                <Link href={`/movie/${featured.slug}`}>
                  <h3 className="mt-6 font-serif text-3xl text-[#e5e2e1] hover:text-[#ffe2ab] transition-colors">
                    {featured.title}
                  </h3>
                </Link>
                <p className="mt-1 font-sans text-xs uppercase tracking-wider text-[#9c8f78]">
                  {featured.rating} · {featured.runtime} · {featured.genre}
                </p>
                <p className="mt-4 font-sans text-sm leading-6 text-[#d4c5ab]">
                  {featured.tagline}
                </p>
                <div className="mt-6">
                  <Link
                    href={`/movie/${featured.slug}`}
                    className="font-sans text-xs font-semibold uppercase tracking-wider text-[#ffe2ab] hover:text-[#ffbf00] transition-colors"
                  >
                    Showtimes &amp; Tickets →
                  </Link>
                </div>
              </article>
            )}

            {/* Secondary film — 40% */}
            {secondary && (
              <article className="lg:col-span-2 bg-[#1c1b1b] p-8 flex flex-col justify-between">
                <div>
                  <div className="flex gap-3 items-center mb-6">
                    <span className="rounded-[0.125rem] bg-[#a0030e] px-2 py-0.5 font-sans text-xs font-semibold uppercase tracking-wider text-[#ffa99f]">
                      Now Playing
                    </span>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={secondary.poster}
                    alt={`${secondary.title} poster`}
                    className="h-48 w-full object-cover rounded-[0.125rem]"
                  />
                  <Link href={`/movie/${secondary.slug}`}>
                    <h3 className="mt-5 font-serif text-2xl text-[#e5e2e1] hover:text-[#ffe2ab] transition-colors">
                      {secondary.title}
                    </h3>
                  </Link>
                  <p className="mt-1 font-sans text-xs uppercase tracking-wider text-[#9c8f78]">
                    {secondary.rating} · {secondary.runtime} · {secondary.genre}
                  </p>
                  <p className="mt-3 font-sans text-sm leading-6 text-[#d4c5ab]">
                    {secondary.tagline}
                  </p>
                </div>
                <div className="mt-6">
                  <Link
                    href={`/movie/${secondary.slug}`}
                    className="font-sans text-xs font-semibold uppercase tracking-wider text-[#ffe2ab] hover:text-[#ffbf00] transition-colors"
                  >
                    Showtimes &amp; Tickets →
                  </Link>
                </div>
              </article>
            )}
          </div>
        </div>
      </section>

      {/* ── Coming Soon ── */}
      {comingSoon.length > 0 && (
        <section className="py-16">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <p className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-[#9c8f78]">
              Coming Soon
            </p>
            <h2 className="mt-3 font-serif text-4xl text-[#e5e2e1]">
              On the Horizon
            </h2>
            <div className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
              {comingSoon.map((film) => (
                <article key={film.slug} className="group">
                  <Link href={`/movie/${film.slug}`} className="block">
                    <div className="aspect-[2/3] overflow-hidden rounded-[0.125rem] bg-[#201f1f]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={film.poster}
                        alt={film.title}
                        className="h-full w-full object-cover opacity-70 transition-opacity group-hover:opacity-90"
                      />
                    </div>
                    <h3 className="mt-3 font-serif text-base text-[#e5e2e1] transition-colors group-hover:text-[#ffe2ab]">
                      {film.title}
                    </h3>
                    <p className="mt-0.5 font-sans text-xs text-[#9c8f78]">
                      {film.genre} · {film.rating}
                    </p>
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Our Theaters ── */}
      <section className="bg-[#1c1b1b] py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-[#9c8f78]">
            Our Locations
          </p>
          <h2 className="mt-3 font-serif text-4xl text-[#e5e2e1]">
            Visit Our Houses
          </h2>
          <div className="mt-12 grid gap-0 lg:grid-cols-2">
            {theaters.map((theater, i) => (
              <div
                key={theater.id}
                className={`relative overflow-hidden ${i === 0 ? "bg-[#201f1f]" : "bg-[#2a2a2a]"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={theater.heroImage}
                  alt={`${theater.name} facade`}
                  className="h-64 w-full object-cover opacity-50"
                />
                <div className="p-8">
                  <h3 className="font-serif text-2xl text-[#ffe2ab]">
                    {theater.name}
                  </h3>
                  <p className="mt-1 font-sans text-xs uppercase tracking-wider text-[#9c8f78]">
                    {theater.district} · Est. {theater.established}
                  </p>
                  <ul className="mt-4 space-y-1 font-sans text-sm text-[#d4c5ab]">
                    {theater.specs.slice(0, 3).map((spec) => (
                      <li key={spec.label}>{spec.value}</li>
                    ))}
                  </ul>
                  <Link
                    href={`/theaters/${theater.slug}`}
                    className="mt-6 inline-flex items-center gap-1 font-sans text-xs font-semibold uppercase tracking-wider text-[#ffe2ab] hover:text-[#ffbf00] transition-colors"
                  >
                    Explore →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
