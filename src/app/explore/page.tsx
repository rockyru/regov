import { portalSlugs, getPortal } from "@/lib/explore";
import { AppHeader, AppFooter, eyebrow } from "@/components/AppShell";
import { PortalShowcase } from "@/components/PortalShowcase";

export const metadata = { title: "Explore", description: "Tourism portals for Philippine towns, gathered from their LGUs' own pages. Unofficial concepts." };

/** RE:GOV Explore: every tourism portal (src/lib/explore), each opening into /explore/[slug]. */
export default function Explore() {
  const slugs = portalSlugs();
  const portals = slugs.map(getPortal).filter((p) => p !== null);
  const places = portals.reduce((n, p) => n + p.places.length, 0);
  const events = portals.reduce((n, p) => n + p.events.length, 0);
  return (
    <>
      <AppHeader />
      <main className="flex-1">
        <div className="container-gov pt-10 pb-20">
          <div className="grid gap-x-12 gap-y-6 border-b border-neutral-300 pb-8 lg:grid-cols-[17rem_1fr]">
            <p className={`${eyebrow} pt-3 text-kapwa-brand-900`}>Explore</p>
            <div>
              <h1 className="text-4xl font-display font-normal leading-[0.95] tracking-tight sm:text-6xl">Tourism portals.</h1>
              <p className="mt-4 max-w-2xl text-lg text-neutral-600">Reimagine rebuilds a government website. Explore is for visitors: a town&apos;s history, places, events and travel notes, gathered from its LGU&apos;s own pages into one portal. Every fact links back to its source, and every photo is labelled for what it is.</p>
              <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-3">
                {[[portals.length, portals.length === 1 ? "portal" : "portals"], [places, "places"], [events, "events"]].map(([v, l]) => <div key={String(l)}><dd className="text-3xl font-display tabular-nums text-kapwa-brand-900">{v}</dd><dt className="text-[13px] text-neutral-500">{l}</dt></div>)}
              </dl>
            </div>
          </div>
          {slugs.map((s, i) => <PortalShowcase key={s} slug={s} i={i} />)}
          <p className="mt-14 max-w-2xl text-[13px] text-neutral-500">Explore portals are unofficial concepts by RE:GOV. They are not made or endorsed by the LGUs or the Department of Tourism; check the linked sources before you travel.</p>
        </div>
      </main>
      <AppFooter />
    </>
  );
}
