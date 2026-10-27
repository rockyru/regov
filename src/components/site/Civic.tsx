import Link from "next/link";
import type { SiteModel } from "@/pipeline/schema";
import { eyebrow, navHref } from "./Shell";
import { CATEGORY_LABEL, NATIONAL_HOTLINES, getWeather, isLgu, kindLinks, localHotlines, siteHotlines, telHref, transparencyPages, wmoGlyph, wmoLabel, TRANSPARENCY_EXTERNAL, type Hotline, type Category } from "@/lib/civic";

const nn = (i: number) => String(i + 1).padStart(2, "0");

/** Masthead-adjacent emergency panel: 911, the site's own numbers, and (for LGUs) today's weather. */
export async function CivicStrip({ site }: { site: SiteModel }) {
  const own = siteHotlines(site);
  const lgu = isLgu(site);
  const weather = lgu ? await getWeather(site) : null;
  if (own.length === 0 && !weather) return null;
  const shown = own.slice(0, lgu ? 7 : 5);
  const cell = "flex flex-col justify-between gap-3 p-4 min-h-24 bg-kapwa-red-700 hover:bg-kapwa-red-800";
  return (
    <section aria-label="Emergency hotlines and local conditions" className={`grid ${weather ? "lg:grid-cols-[1fr_minmax(300px,24%)]" : ""}`}>
      <div className="bg-kapwa-red-700 text-white h-full">
        <div className={`${weather ? "pl-5 sm:pl-8 lg:pl-12 pr-0" : "container-gov"} h-full grid auto-rows-fr grid-cols-2 md:grid-cols-[repeat(auto-fit,minmax(13rem,1fr))] border-l border-white/20 *:border-r *:border-b *:border-white/20`}>
          <a href="tel:911" className="flex flex-col justify-between gap-3 p-4 min-h-24 bg-kapwa-red-800 hover:bg-kapwa-red-900 col-span-2 md:col-span-1">
            <span className={`${eyebrow} text-white/80`}>{lgu ? "Emergency" : "In an emergency"}</span>
            <span className="text-4xl font-extrabold tracking-tight leading-none">911 <span className="text-base font-semibold text-white/70">24/7</span></span>
          </a>
          {shown.map((h) => (
            <a key={h.number} href={telHref(h.number)} className={cell}>
              <span className={`${eyebrow} text-white/80 line-clamp-2`}>{h.name}</span>
              <span className="text-xl font-bold tracking-tight leading-none tabular-nums">{h.number}</span>
            </a>
          ))}
          <Link href={navHref(site.jobId, "hotlines")} className={`${cell} bg-kapwa-red-700/80 justify-end`}>
            <span className="font-semibold">All hotlines <span aria-hidden>→</span></span>
            <span className="text-xs text-white/70">Police, fire, medical, utilities for {site.locality?.province || "the Philippines"}</span>
          </Link>
        </div>
      </div>
      {weather && <WeatherPanel w={weather} />}
    </section>
  );
}

function WeatherPanel({ w }: { w: NonNullable<Awaited<ReturnType<typeof getWeather>>> }) {
  const today = w.daily[0];
  const dayName = (d: string) => new Date(d + "T00:00:00+08:00").toLocaleDateString("en-PH", { weekday: "short", timeZone: "Asia/Manila" });
  return (
    <aside className="bg-kapwa-brand-950 text-white p-5 lg:pr-12 border-t lg:border-t-0 lg:border-l border-white/15">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className={`${eyebrow} text-white/70`}>Weather · {w.place}</h2>
        <span className="text-[11px] font-medium tabular-nums text-white/40">{w.current.time.slice(11, 16)}</span>
      </div>
      <div className="mt-3 flex items-end gap-4">
        <span className="text-5xl font-extrabold tracking-tight leading-none tabular-nums">{Math.round(w.current.temp)}°</span>
        <span className="pb-1 text-sm leading-snug"><span className="block font-semibold">{wmoGlyph(w.current.code)} {wmoLabel(w.current.code)}</span><span className="text-white/60">Feels {Math.round(w.current.feels)}° · {w.current.humidity}% humidity · {Math.round(w.current.wind)} km/h</span></span>
      </div>
      <ol className="mt-4 grid grid-cols-4 border-t border-white/15 text-center">
        {w.daily.map((d, i) => (
          <li key={d.date} className={`py-2.5 ${i ? "border-l border-white/15" : ""}`}>
            <div className={`${eyebrow} text-white/60`}>{i === 0 ? "Today" : dayName(d.date)}</div>
            <div className="mt-1 text-lg" aria-label={wmoLabel(d.code)}>{wmoGlyph(d.code)}</div>
            <div className="text-sm font-semibold tabular-nums">{Math.round(d.max)}° <span className="text-white/50 font-normal">{Math.round(d.min)}°</span></div>
            {d.rain >= 30 && <div className="text-[11px] text-kapwa-yellow-300">{d.rain}% rain</div>}
          </li>
        ))}
      </ol>
      <p className="mt-3 text-[11px] text-white/40">Open-Meteo · {today ? `${Math.round(today.min)}–${Math.round(today.max)}° today` : ""} · Not an official PAGASA advisory</p>
    </aside>
  );
}

/** Home-page section: transparency pages the agent found, plus the right government portals for this kind of body. */
export function TransparencySection({ site, n }: { site: SiteModel; n: number }) {
  const pages = transparencyPages(site);
  const ext = kindLinks(site);
  const lgu = isLgu(site);
  return (
    <section id="transparency" className="py-14 scroll-mt-20">
      <div className="border-t-2 border-neutral-900 pt-5 grid gap-3 lg:grid-cols-[1fr_minmax(0,34rem)] lg:gap-12 items-end">
        <div>
          <div className={`${eyebrow} text-kapwa-brand-700`}>{nn(n)}</div>
          <h2 className="mt-2 font-bold tracking-tight text-neutral-900 text-3xl sm:text-4xl leading-[1.05]">Transparency and accountability</h2>
        </div>
        <p className="text-[17px] leading-relaxed text-neutral-600 lg:text-right">{lgu ? "Budgets, bids, plans and reports every local government must publish, plus the national portals that keep them honest." : "Documents this office publishes under the Transparency Seal, and the national portals where you can check procurement, budgets and records."}</p>
      </div>
      <div className="mt-8 grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <h3 className={`${eyebrow} text-neutral-500 border-b border-neutral-900 pb-2`}>Published by {site.agency.short_name || "this office"}</h3>
          {pages.length > 0 ? (
            <ol className="divide-y divide-neutral-200">
              {pages.map((p, i) => <li key={p.slug}><Link href={navHref(site.jobId, p.slug)} className="flex gap-3 py-3 font-medium text-neutral-900 hover:text-kapwa-brand-900"><span className="text-xs font-semibold tabular-nums text-neutral-400 pt-1">{nn(i)}</span>{p.label}</Link></li>)}
            </ol>
          ) : (
            <p className="py-3 text-sm text-neutral-500">The agent found no transparency pages on the original site. Under the Transparency Seal every agency should publish its mandate, officials, budget, procurement plan and reports.</p>
          )}
        </div>
        <div>
          <h3 className={`${eyebrow} text-neutral-500 border-b border-neutral-900 pb-2`}>Check nationally</h3>
          <ul className="divide-y divide-neutral-200">
            {TRANSPARENCY_EXTERNAL.map((l) => <li key={l.href}><a href={l.href} target="_blank" rel="noreferrer" className="block py-3 hover:text-kapwa-brand-900"><span className="font-medium text-neutral-900">{l.label} <span aria-hidden className="text-neutral-400">↗</span></span>{l.note && <span className="block text-sm text-neutral-500">{l.note}</span>}</a></li>)}
          </ul>
        </div>
        <div>
          <h3 className={`${eyebrow} text-neutral-500 border-b border-neutral-900 pb-2`}>{lgu ? "For residents" : site.site_kind === "university" || site.site_kind === "school" ? "For students" : site.site_kind === "hospital" ? "For patients" : "Related portals"}</h3>
          <ul className="divide-y divide-neutral-200">
            {ext.map((l) => <li key={l.href}><a href={l.href} target={l.href.startsWith("tel:") ? undefined : "_blank"} rel="noreferrer" className="block py-3 hover:text-kapwa-brand-900"><span className="font-medium text-neutral-900">{l.label} <span aria-hidden className="text-neutral-400">↗</span></span>{l.note && <span className="block text-sm text-neutral-500">{l.note}</span>}</a></li>)}
          </ul>
        </div>
      </div>
    </section>
  );
}

function HotlineTable({ rows, showArea }: { rows: Hotline[]; showArea?: boolean }) {
  return (
    <ul className="border-t border-neutral-900 grid sm:grid-cols-2 xl:grid-cols-3 gap-x-10">
      {rows.map((h, i) => (
        <li key={h.number + h.name + i} className="border-b border-neutral-200">
          <a href={telHref(h.number)} className="group flex items-baseline justify-between gap-4 py-3 hover:text-kapwa-brand-900">
            <span className="min-w-0"><span className="block font-medium text-neutral-900 leading-snug">{h.name}</span>{(showArea && h.area) || h.alt?.length ? <span className="block text-xs text-neutral-500">{[showArea ? h.area : "", ...(h.alt ?? [])].filter(Boolean).join(" · ")}</span> : null}</span>
            <span className="shrink-0 font-semibold tabular-nums tracking-tight text-kapwa-brand-900 group-hover:underline">{h.number}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

const ORDER: Category[] = ["emergency", "police", "fire", "medical", "government", "utility", "office"];
function byCategory(rows: Hotline[]) {
  const m = new Map<Category, Hotline[]>();
  for (const r of rows) (m.get(r.category) ?? m.set(r.category, []).get(r.category)!).push(r);
  return ORDER.filter((c) => m.has(c)).map((c) => ({ category: c, rows: m.get(c)! }));
}

/** Virtual page: /preview/<job>/hotlines */
export function HotlinesPage({ site }: { site: SiteModel }) {
  const own = siteHotlines(site);
  const local = localHotlines(site);
  const loc = site.locality ?? { province: "", region: "", city: "" };
  const ownPage = site.pages.find((p) => /hotline|emergency/i.test(p.slug) || /hotline|emergency/i.test(p.title));
  const groups: { title: string; deck: string; rows: Hotline[]; area?: boolean }[] = [
    { title: `${site.agency.short_name || site.agency.name} numbers`, deck: "Offices and hotlines published on the original site.", rows: own },
    { title: loc.city ? `${loc.city} hotlines` : "City hotlines", deck: "From the BetterGov.ph emergency hotlines dataset.", rows: local.city },
    { title: loc.province ? `${loc.province} hotlines` : "Provincial hotlines", deck: "Nearby cities and municipalities in the same province.", rows: local.province, area: true },
    { title: loc.region ? `${loc.region} hotlines` : "Regional hotlines", deck: "Elsewhere in the region.", rows: local.region.slice(0, 60), area: true },
  ].filter((g) => g.rows.length > 0);
  let n = 0;
  return (
    <>
      <div className="border-b-2 border-neutral-900 bg-white">
        <div className="container-gov py-10 lg:py-14">
          <nav aria-label="Breadcrumb" className={`${eyebrow} text-neutral-500 flex gap-2`}><Link href={navHref(site.jobId, "home")} className="hover:text-kapwa-brand-900">Home</Link><span className="text-neutral-300">/</span><span className="text-neutral-900">Hotlines</span></nav>
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_minmax(0,32rem)] lg:gap-16 items-end">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-[-0.02em] leading-[1.0] text-neutral-900">Emergency hotlines</h1>
            <p className="text-lg leading-relaxed text-neutral-600 lg:border-l lg:border-neutral-300 lg:pl-6">Numbers for {[loc.city, loc.province].filter(Boolean).join(", ") || "the Philippines"}: this office, nearby responders, and the national lines that work anywhere. Tap a number to call.</p>
          </div>
        </div>
      </div>
      <div className="container-gov">
        <a href="tel:911" className="mt-10 flex flex-wrap items-center justify-between gap-6 bg-kapwa-red-700 text-white p-6 sm:p-8 hover:bg-kapwa-red-800">
          <span><span className={`${eyebrow} text-white/80`}>Life-threatening emergency</span><span className="block mt-1 text-5xl sm:text-6xl font-extrabold tracking-tight leading-none">911</span></span>
          <span className="max-w-md text-[15px] leading-relaxed text-white/85">The national emergency hotline, free from any phone, 24 hours a day. For police, fire, medical and rescue, call 911 first and then the local responder.</span>
        </a>
        {groups.map((g) => (
          <section key={g.title} className="py-12">
            <div className="border-t-2 border-neutral-900 pt-5 grid gap-3 lg:grid-cols-[1fr_minmax(0,30rem)] lg:gap-12 items-end">
              <div><div className={`${eyebrow} text-kapwa-brand-700`}>{nn(n++)}</div><h2 className="mt-2 text-3xl font-bold tracking-tight text-neutral-900">{g.title}</h2></div>
              <p className="text-[15px] text-neutral-600 lg:text-right">{g.deck}{g.title.endsWith("numbers") && ownPage && <> See also <Link className="underline" href={navHref(site.jobId, ownPage.slug)}>{ownPage.title}</Link>.</>}</p>
            </div>
            <div className="mt-6 space-y-8">
              {byCategory(g.rows).map((c) => (
                <div key={c.category}>
                  {byCategory(g.rows).length > 1 && <h3 className={`${eyebrow} text-neutral-500 mb-2`}>{CATEGORY_LABEL[c.category]}</h3>}
                  <HotlineTable rows={c.rows} showArea={g.area} />
                </div>
              ))}
            </div>
          </section>
        ))}
        <section className="py-12">
          <div className="border-t-2 border-neutral-900 pt-5 grid gap-3 lg:grid-cols-[1fr_minmax(0,30rem)] lg:gap-12 items-end">
            <div><div className={`${eyebrow} text-kapwa-brand-700`}>{nn(n++)}</div><h2 className="mt-2 text-3xl font-bold tracking-tight text-neutral-900">National hotlines</h2></div>
            <p className="text-[15px] text-neutral-600 lg:text-right">Work from anywhere in the Philippines. Curated from BetterGov.ph&rsquo;s critical emergency hotlines.</p>
          </div>
          <div className="mt-6"><HotlineTable rows={NATIONAL_HOTLINES} /></div>
        </section>
        <p className="pb-6 text-sm text-neutral-500">Local numbers come from the open <a className="underline" href="https://bettergov.ph/data/hotlines" target="_blank" rel="noreferrer">BetterGov.ph hotlines dataset</a> and from the original website. Numbers change; if one fails, call 911.</p>
      </div>
    </>
  );
}
