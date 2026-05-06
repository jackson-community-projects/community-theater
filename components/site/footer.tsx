import Link from "next/link";

import { getTheaters } from "@/lib/data";
import { APP_NAME, BUSINESS_NAME } from "@/lib/config";

function getTheaterStatusLabel(status: "active" | "inactive" | "seasonal") {
  switch (status) {
    case "inactive":
      return "Temporarily Dark";
    case "seasonal":
      return "Seasonal Programming";
    default:
      return null;
  }
}

export async function SiteFooter() {
  const theaters = await getTheaters();
  const contactEmail =
    theaters.find((theater) => theater.status === "active")?.contactEmail ||
    theaters[0]?.contactEmail;

  return (
    <footer className="mt-auto bg-[#0e0e0e]">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:justify-between lg:gap-16">
          <div className="max-w-md">
            <p className="font-serif text-lg text-[#ffe2ab]">{APP_NAME}</p>
            <p className="mt-2 max-w-sm text-sm font-sans leading-6 text-[#d4c5ab]">
              Historic theaters, neighborhood events, and repertory programming
              across our small-town cinema network.
            </p>
            <div className="mt-6 space-y-1 text-xs font-sans leading-6 text-[#9c8f78]">
              <p>© {new Date().getFullYear()} {APP_NAME}. All Rights Reserved.</p>
              <p>Operated by {BUSINESS_NAME}.</p>
              <p>Site by Danger Incorporated.</p>
            </div>
          </div>

          <nav
            aria-label="Footer sitemap"
            className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-12"
          >
            <section>
              <h2 className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-[#ffbf00]">
                Explore
              </h2>
              <ul className="mt-4 space-y-3 text-sm font-sans text-[#d4c5ab]">
                <li>
                  <Link
                    href="/showtimes"
                    className="transition-colors hover:text-[#ffe2ab]"
                  >
                    Showtimes
                  </Link>
                </li>
                <li>
                  <Link
                    href="/events"
                    className="transition-colors hover:text-[#ffe2ab]"
                  >
                    Events
                  </Link>
                </li>
                <li>
                  <Link
                    href="/about"
                    className="transition-colors hover:text-[#ffe2ab]"
                  >
                    About Us
                  </Link>
                </li>
                <li>
                  {contactEmail ? (
                    <a
                      href={`mailto:${contactEmail}`}
                      className="transition-colors hover:text-[#ffe2ab]"
                    >
                      Contact
                    </a>
                  ) : (
                    <span className="text-[#9c8f78]">Contact</span>
                  )}
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-[#ffbf00]">
                Our Theatres
              </h2>
              <ul className="mt-4 space-y-3 text-sm font-sans text-[#d4c5ab]">
                {theaters.map((theater) => {
                  const statusLabel = getTheaterStatusLabel(theater.status);
                  const isActive = theater.status === "active";

                  return (
                    <li key={theater.slug}>
                      <Link
                        href={`/theaters/${theater.slug}`}
                        aria-describedby={
                          statusLabel ? `${theater.slug}-status` : undefined
                        }
                        className={`block transition-colors ${
                          isActive
                            ? "hover:text-[#ffe2ab]"
                            : "text-[#a8997f] opacity-60 hover:text-[#d4c5ab]"
                        }`}
                      >
                        <span>{theater.name}</span>
                        {statusLabel ? (
                          <span
                            id={`${theater.slug}-status`}
                            className="mt-1 block text-[11px] uppercase tracking-[0.18em] text-[#8f826b]"
                          >
                            {statusLabel}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section>
              <h2 className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-[#ffbf00]">
                Info
              </h2>
              <ul className="mt-4 space-y-3 text-sm font-sans text-[#d4c5ab]">
                <li>
                  <span
                    aria-disabled="true"
                    className="cursor-default text-[#9c8f78]"
                  >
                    Privacy Policy
                  </span>
                </li>
                <li>
                  <Link
                    href="/sitemap.xml"
                    className="transition-colors hover:text-[#ffe2ab]"
                  >
                    Sitemap
                  </Link>
                </li>
              </ul>
            </section>
          </nav>
        </div>
      </div>
    </footer>
  );
}
