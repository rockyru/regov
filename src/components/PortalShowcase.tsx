/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { getPortal } from "@/lib/explore";
import { eyebrow, nn } from "@/components/AppShell";
import { Reveal } from "@/components/Reveal";

/**
 * One portal on the /explore page: a large print of the town with its four parts beside it, each
 * a door into its section of the portal. Counts come from the portal's own data
 * (src/lib/explore/), so they stay true as it grows.
 */
export function PortalShowcase({ slug, i }: { slug: string; i: number }) {
  const p = getPortal(slug);
  if (!p) return null;
  const href = `/explore/${p.slug}`;
  const ch = p.story.chapters;
  const parts = [
    { id: "story", label: "Story", stat: `${ch.length} chapters`, note: `${ch[0].year} to ${ch[ch.length - 1].year}`, photo: ch.find((c, k) => k > 0 && c.photo)?.photo ?? ch[0].photo },
    { id: "places", label: "Places", stat: `${p.places.length} places`, note: "On an interactive coast map", photo: p.places.find((x) => x.photo && x.photo.src !== p.hero.src)?.photo },
    { id: "events", label: "Events", stat: `${p.events.length} events`, note: "The town's year, month by month", photo: p.events.find((e) => e.photo)?.photo },
    { id: "plan", label: "Plan your trip", stat: "Bus, car, plane", note: "The fee, the tourism office, hotlines", photo: p.gettingThere.art },
  ];
  const hosts = [...new Set(p.sources.map((s) => new URL(s.url).host))];
  return (
    <article className={i ? "mt-14 border-t border-neutral-300 pt-6" : "mt-8"}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
        <h2 className="flex items-baseline gap-3 text-2xl font-display font-normal tracking-tight text-neutral-900 sm:text-3xl"><span className="text-[11px] font-semibold tabular-nums font-sans text-neutral-500">{nn(i)}</span>{p.town}, {p.province}</h2>
        <Link href={href} className="text-sm font-semibold text-neutral-900 hover:text-kapwa-brand-900">Open the {p.town} portal →</Link>
      </div>
      <Reveal className="mt-6 grid gap-6 lg:grid-cols-12">
        <Link href={href} className="group relative block min-h-[420px] overflow-hidden bg-neutral-900 text-white lg:col-span-7 lg:min-h-[560px]" aria-label={`Open the ${p.town} portal`}>
          <img src={p.hero.src} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1.6s] ease-out group-hover:scale-[1.04]" />
          <span aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.35)_0%,rgba(0,0,0,0)_30%,rgba(0,0,0,0)_45%,rgba(0,0,0,0.78)_100%)]" />
          <span className="absolute left-5 top-5 bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-neutral-800">Unofficial concept · AI placeholder photos</span>
          <span className="absolute inset-x-6 bottom-6 sm:inset-x-8 sm:bottom-8">
            <span className={`${eyebrow} block text-white/80`}>{p.town}, {p.province} · {p.region}</span>
            <span className="mt-3 block font-display text-5xl leading-[0.95] tracking-tight sm:text-7xl">This is {p.town}</span>
            <span className="mt-3 block max-w-md text-[15px] text-white/85">{p.promise}. {p.lede}</span>
            <span className="mt-5 inline-flex h-11 items-center gap-2 bg-white px-5 text-[15px] font-semibold text-neutral-900 transition-colors group-hover:bg-kapwa-brand-50">View the portal →</span>
          </span>
        </Link>
        <div className="flex flex-col lg:col-span-5">
          <ol className="grid grid-cols-2 border-l border-t border-neutral-300">
            {parts.map((x, k) => (
              <li key={x.id} className="border-b border-r border-neutral-300">
                <Link href={`${href}#${x.id}`} className="group flex h-full flex-col p-3 hover:bg-kapwa-brand-50 sm:p-4">
                  <span className="block aspect-[3/2] overflow-hidden bg-neutral-200">
                    {x.photo && <img src={x.photo.src} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />}
                  </span>
                  <span className={`${eyebrow} mt-3 flex items-center gap-2 text-neutral-500`}><span className="tabular-nums text-kapwa-brand-900">{nn(k)}</span>{x.label}</span>
                  <span className="mt-1 block text-lg font-semibold leading-snug text-neutral-900">{x.stat}</span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-neutral-600">{x.note}</span>
                </Link>
              </li>
            ))}
          </ol>
          <p className="mt-5 text-[15px] leading-relaxed text-neutral-600">A scroll-told story that hands off to a map, a coast map you can pan and zoom, a page for every place and event, and the trip from Manila stop by stop, with illustrations by Muse Image.</p>
          <p className="mt-3 text-[13px] text-neutral-500">Built from {hosts.map((h, k) => <span key={h}>{k ? " and " : ""}<a href={`https://${h}`} rel="noopener" className="font-semibold text-neutral-700 underline decoration-neutral-300 underline-offset-4 hover:decoration-neutral-700">{h}</a></span>)}. Not made by the LGU or the Department of Tourism.</p>
        </div>
      </Reveal>
    </article>
  );
}
