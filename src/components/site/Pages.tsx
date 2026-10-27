import Link from "next/link";
import type { SiteModel, SitePage } from "@/pipeline/schema";
import { Block } from "./Blocks";
import { Markdown } from "./Markdown";
import { navHref, eyebrow } from "./Shell";
import { CivicStrip, TransparencySection } from "./Civic";

const slugTitle = (site: SiteModel, slug: string) => site.pages.find((p) => p.slug === slug)?.title ?? slug;
const initialsOf = (n: string) => n.split(/\s+/).filter((w) => /^[A-Z]/.test(w)).slice(0, 2).map((w) => w[0]).join("") || "•";
const slugSummary = (site: SiteModel, slug: string) => site.pages.find((p) => p.slug === slug)?.summary ?? "";
const nn = (i: number) => String(i + 1).padStart(2, "0");

/** WordPress titles arrive with 𝐛𝐨𝐥𝐝 unicode and "NEWS |" prefixes: normalise and split off the kicker. */
function newsTitle(raw: string): { kicker: string; title: string } {
  const t = raw.normalize("NFKC").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#8217;|&rsquo;/g, "’").replace(/&#8220;|&#8221;|&ldquo;|&rdquo;/g, '"').trim();
  const m = t.match(/^([A-Z][A-Z !]{2,24})\s*[|:–—-]\s*(.+)$/);
  return m ? { kicker: m[1].trim(), title: m[2].trim() } : { kicker: "", title: t };
}

/** Editorial section head: numbered eyebrow, heavy top rule, heading left, deck right. */
function SectionHead({ n, title, deck, small }: { n: number; title: string; deck?: string; small?: boolean }) {
  return (
    <div className="border-t-2 border-neutral-900 pt-5 grid gap-3 lg:grid-cols-[1fr_minmax(0,34rem)] lg:gap-12 items-end">
      <div>
        <div className={`${eyebrow} text-kapwa-brand-700`}>{nn(n)}</div>
        <h2 className={`mt-2 font-bold tracking-tight text-neutral-900 ${small ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl"} leading-[1.05]`}>{title}</h2>
      </div>
      {deck && <p className="text-[17px] leading-relaxed text-neutral-600 lg:text-right lg:border-l-0">{deck}</p>}
    </div>
  );
}

/** Square "tag" list used for units, barangays and campuses. */
function Tags({ items, jobId }: { items: { name: string; detail?: string; slug?: string }[]; jobId: string }) {
  const cls = "inline-block border border-neutral-300 px-3.5 py-1.5 text-sm font-medium text-neutral-800 hover:border-neutral-900 hover:text-neutral-900";
  return (
    <ul className="mt-6 flex flex-wrap gap-2">
      {items.map((u) => <li key={u.name} title={u.detail}>{u.slug ? <Link href={navHref(jobId, u.slug)} className={cls}>{u.name}</Link> : <span className={cls}>{u.name}</span>}</li>)}
    </ul>
  );
}

/** Masthead for sites that were already modern: light, their colour and hero picture, services as cards. */
function RefinedMasthead({ site, hero, parentLine, servicesLabel }: { site: SiteModel; hero: SitePage["hero"]; parentLine: string; servicesLabel: string }) {
  const { jobId, agency } = site;
  const v = encodeURIComponent(site.generated_at);
  const art = site.design?.hero ? `/api/jobs/${jobId}/${site.design.hero}?v=${v}` : site.assets.cover ? `/api/jobs/${jobId}/${site.assets.cover}?v=${v}` : null;
  const services = site.popular_services.slice(0, 6);
  const first = services[0];
  const heading = hero.heading && hero.heading.length <= 70 ? hero.heading : agency.name;
  return (
    <section className="refined bg-[linear-gradient(180deg,var(--color-kapwa-brand-50)_0%,#fff_70%)]">
      <div className="container-gov grid items-center gap-10 py-14 lg:grid-cols-[1.1fr_1fr] lg:py-20">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-kapwa-brand-200 bg-white px-3.5 py-1 text-[13px] font-semibold text-kapwa-brand-900"><span className="size-1.5 rounded-full bg-kapwa-brand-900" aria-hidden />{parentLine}</p>
          <h1 className="mt-6 max-w-[16ch] text-[2.6rem] font-extrabold leading-[1.02] tracking-[-0.025em] text-neutral-900 sm:text-6xl">{heading}</h1>
          <p className="mt-5 max-w-xl text-xl leading-snug text-neutral-600">{hero.subheading || agency.tagline}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            {hero.primary_cta_label && hero.primary_cta_href ? (
              <a href={hero.primary_cta_href} className="inline-flex h-12 items-center rounded-full bg-kapwa-brand-900 px-6 font-semibold text-white shadow-sm hover:bg-kapwa-brand-950">{hero.primary_cta_label} →</a>
            ) : first && <Link href={navHref(jobId, first.slug)} className="inline-flex h-12 items-center rounded-full bg-kapwa-brand-900 px-6 font-semibold text-white shadow-sm hover:bg-kapwa-brand-950">{first.title} →</Link>}
            {first && <a href="#services" className="inline-flex h-12 items-center rounded-full border border-neutral-300 bg-white px-6 font-semibold text-neutral-900 hover:border-kapwa-brand-900">{servicesLabel}</a>}
          </div>
        </div>
        {art && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={art} alt="" className="mx-auto max-h-[460px] w-auto max-w-full rounded-3xl object-contain mix-blend-multiply" />
        )}
      </div>
      {services.length > 0 && (
        <div id="services" className="container-gov pb-14">
          <h2 className={`${eyebrow} text-neutral-500`}>{servicesLabel}</h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s, i) => (
              <li key={s.slug + s.title}>
                <Link href={navHref(jobId, s.slug)} className="group flex h-full gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-kapwa-brand-300 hover:shadow-md">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-kapwa-brand-50 text-sm font-bold tabular-nums text-kapwa-brand-900">{nn(i)}</span>
                  <span className="min-w-0">
                    <span className="block font-semibold leading-snug text-neutral-900 group-hover:text-kapwa-brand-900">{s.title}</span>
                    {s.description && <span className="mt-1 block text-sm text-neutral-600 line-clamp-2">{s.description}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export async function HomePage({ site, page }: { site: SiteModel; page: SitePage }) {
  const { jobId, agency } = site;
  const hero = page.hero;
  const kind = site.site_kind ?? "national_agency";
  const isLgu = ["province", "city_municipality", "barangay"].includes(kind);
  const locality = site.locality ?? { province: "", region: "", city: "" };
  const ents = site.entities ?? [];
  const of = (t: string) => ents.filter((e) => e.type === t && e.name);
  const officials = of("official"), barangays = of("barangay"), programs = of("program"), campuses = of("campus"), units = of("unit");
  const servicesLabel = isLgu ? "Services for residents" : kind === "university" || kind === "school" ? "For students and applicants" : kind === "hospital" ? "For patients and visitors" : kind === "embassy" ? "Consular services" : kind === "goc_corporation" ? "For members and customers" : "Popular services";
  // Drop home blocks that repeat the WordPress news feed (same links or a news-like heading).
  const newsHrefs = new Set(site.news.map((nw) => nw.href.replace(/\/$/, "")));
  const repeatsNews = (b: SitePage["blocks"][number]) => site.news.length > 0 && (b.type === "cards" || b.type === "links" || b.type === "list") && (
    /\b(news|updates|announcements|events|happening|press|stories|latest)\b/i.test(b.heading) ||
    (b.items.length > 2 && b.items.filter((it) => newsHrefs.has(it.href.replace(/\/$/, ""))).length >= b.items.length / 2));
  const mainBlocks = page.blocks.filter((b) => b.type !== "contact" && !repeatsNews(b));
  const contact = page.blocks.find((b) => b.type === "contact");
  const parentLine = locality.province && kind !== "province" && !agency.parent.toLowerCase().includes(locality.province.toLowerCase()) ? `${agency.parent} · ${locality.province}` : agency.parent;
  const showFeatured = hero.heading && hero.heading.trim().toLowerCase() !== agency.name.trim().toLowerCase();
  let n = 0;

  return (
    <>
      {site.design?.mode === "refine" ? <RefinedMasthead site={site} hero={hero} parentLine={parentLine} servicesLabel={servicesLabel} /> : (
      /* Masthead: flat, ruled, typographic */
      <section className="bg-kapwa-brand-950 text-white">
        <div className="container-gov grid lg:grid-cols-[1.15fr_1fr]">
          <div className="py-14 lg:py-20 lg:pr-16 lg:border-r lg:border-white/15">
            <div className="flex items-center gap-3">
              <span className="h-px w-10 bg-kapwa-yellow-400" aria-hidden />
              <p className={`${eyebrow} text-kapwa-yellow-300`}>{parentLine}</p>
            </div>
            <h1 className="mt-5 text-[2.6rem] sm:text-6xl lg:text-7xl font-extrabold tracking-[-0.02em] leading-[0.98] max-w-[14ch]">{agency.name}</h1>
            {agency.tagline && <p className="mt-6 text-xl sm:text-2xl text-white/80 max-w-xl leading-snug">{agency.tagline}</p>}
            {showFeatured && (
              <a href={hero.primary_cta_href || "#"} className="mt-10 flex items-start gap-4 border-t border-white/20 pt-5 max-w-xl group">
                <span className={`${eyebrow} text-kapwa-yellow-400 shrink-0 mt-1`}>Featured</span>
                <span className="text-[15px] sm:text-base leading-snug"><span className="font-semibold">{hero.heading}</span>{hero.primary_cta_label && <span className="block text-white/70 mt-0.5 group-hover:text-white">{hero.primary_cta_label} →</span>}</span>
              </a>
            )}
          </div>
          <div className="py-10 lg:py-20 lg:pl-16 border-t border-white/15 lg:border-t-0">
            <h2 className={`${eyebrow} text-white/70 flex items-center justify-between`}>{servicesLabel}<span className="font-semibold tabular-nums text-white/80">{site.popular_services.slice(0, 6).length} entries</span></h2>
            <ol className="mt-4 border-t border-white/20">
              {site.popular_services.slice(0, 6).map((s, i) => (
                <li key={s.slug + s.title} className="border-b border-white/15">
                  <Link href={navHref(jobId, s.slug)} className="group grid grid-cols-[2.5rem_1fr_auto] items-baseline gap-3 py-3.5 hover:bg-white/5 -mx-3 px-3">
                    <span className="text-sm font-semibold tabular-nums text-kapwa-yellow-400">{nn(i)}</span>
                    <span className="min-w-0">
                      <span className="block font-semibold leading-snug text-[17px]">{s.title}</span>
                      {s.description && <span className="mt-0.5 block text-sm text-white/65 line-clamp-1">{s.description}</span>}
                    </span>
                    <span aria-hidden className="text-white/70 transition group-hover:text-white group-hover:translate-x-1">→</span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
      )}

      <CivicStrip site={site} />

      <div className="container-gov">
        {officials.length > 0 && (
          <section className="py-14">
            <SectionHead n={n++} title={isLgu ? "Your local officials" : "Leadership"} deck={isLgu ? `The people elected and appointed to serve ${agency.short_name || agency.name}.` : `The people who lead ${agency.short_name || agency.name}.`} />
            <ul className="mt-8 grid border-t border-l border-neutral-200 *:border-r *:border-b *:border-neutral-200 sm:grid-cols-2 lg:grid-cols-4">
              {officials.slice(0, 8).map((o, i) => {
                const inner = (<><span className="flex items-baseline justify-between"><span className="size-12 bg-kapwa-brand-950 text-white grid place-items-center font-bold text-base">{initialsOf(o.name)}</span><span className="text-xs font-semibold tabular-nums text-neutral-500">{nn(i)}</span></span><span className="block mt-5 font-semibold text-neutral-900 leading-tight text-[17px]">{o.name}</span><span className={`block mt-1.5 ${eyebrow} text-kapwa-brand-800`}>{o.detail}</span></>);
                const cls = "block bg-white p-5 h-full hover:bg-kapwa-brand-50";
                return <li key={o.name + o.detail}>{o.slug ? <Link href={navHref(jobId, o.slug)} className={cls}>{inner}</Link> : <div className={cls}>{inner}</div>}</li>;
              })}
            </ul>
          </section>
        )}

        {programs.length > 0 && (
          <section className="py-14">
            <SectionHead n={n++} title="Programs offered" deck={`${programs.length} programs across ${units.length || "our"} colleges and units.`} />
            <ul className="mt-8 grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
              {programs.slice(0, 18).map((p, i) => {
                const inner = (<><span className="text-xs font-semibold tabular-nums text-neutral-500 w-7 shrink-0 pt-1">{nn(i)}</span><span><span className="block font-medium text-neutral-900">{p.name}</span>{p.detail && <span className="block text-sm text-neutral-500">{p.detail}</span>}</span></>);
                const cls = "flex gap-2 py-3 border-b border-neutral-200 hover:text-kapwa-brand-900";
                return <li key={p.name + p.detail}>{p.slug ? <Link href={navHref(jobId, p.slug)} className={cls}>{inner}</Link> : <div className={cls}>{inner}</div>}</li>;
              })}
            </ul>
          </section>
        )}

        {units.length > 0 && !isLgu && (
          <section className="py-14">
            <SectionHead n={n++} small title={site.site_kind === "university" || site.site_kind === "school" ? "Colleges and units" : site.site_kind === "hospital" ? "Departments and services" : "Offices and units"} />
            <Tags items={units} jobId={jobId} />
          </section>
        )}

        {site.home_sections.map((sec) => (
          <section key={sec.heading} className="py-14">
            <SectionHead n={n++} title={sec.heading} deck={sec.description} />
            <div className="mt-8 grid border-t border-l border-neutral-200 *:border-r *:border-b *:border-neutral-200 sm:grid-cols-2 lg:grid-cols-3">
              {sec.slugs.map((slug, i) => (
                <Link key={slug} href={navHref(jobId, slug)} className="group flex flex-col bg-white p-6 min-h-56 hover:bg-kapwa-brand-50">
                  <span className="text-xs font-semibold tabular-nums text-neutral-500">{nn(i)}</span>
                  <h3 className="mt-6 text-xl font-bold leading-tight tracking-tight text-neutral-900 group-hover:text-kapwa-brand-900">{slugTitle(site, slug)}</h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-neutral-600 line-clamp-3">{slugSummary(site, slug)}</p>
                  <span className="mt-auto pt-6 inline-flex items-center gap-1 text-sm font-semibold text-kapwa-brand-800 border-b border-kapwa-brand-800 w-max">Read <span aria-hidden className="transition group-hover:translate-x-0.5">→</span></span>
                </Link>
              ))}
            </div>
          </section>
        ))}

        {(barangays.length > 0 || campuses.length > 0) && (
          <section className="py-14">
            <SectionHead n={n++} small title={barangays.length ? "Our barangays" : "Our campuses"} deck={barangays.length ? `${barangays.length} barangays${locality.province ? ` in ${agency.short_name || agency.name}, ${locality.province}` : ""}.` : `${campuses.length} campuses.`} />
            <Tags items={barangays.length ? barangays : campuses} jobId={jobId} />
          </section>
        )}

        {site.news.length > 0 && (
          <section className="py-14">
            <SectionHead n={n++} title="News and updates" />
            <ul className="mt-6 border-t border-neutral-200">
              {site.news.slice(0, 5).map((nw) => (
                <li key={nw.href} className="border-b border-neutral-200">
                  <a href={nw.href} className="group grid gap-2 py-5 md:grid-cols-[9rem_1fr_auto] md:gap-8 items-baseline hover:bg-kapwa-brand-50 -mx-3 px-3">
                    <time className="text-xs font-medium tabular-nums text-neutral-500">{nw.date.slice(0, 10)}</time>
                    <span className="min-w-0">{newsTitle(nw.title).kicker && <span className={`${eyebrow} text-kapwa-red-700 block mb-1`}>{newsTitle(nw.title).kicker}</span>}<h3 className="text-lg font-semibold leading-snug text-neutral-900 group-hover:text-kapwa-brand-900">{newsTitle(nw.title).title}</h3><p className="mt-1.5 text-[15px] leading-relaxed text-neutral-600 line-clamp-2">{nw.excerpt.normalize("NFKC")}</p></span>
                    <span aria-hidden className="hidden md:inline text-neutral-500 group-hover:text-kapwa-brand-900">→</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        <TransparencySection site={site} n={n++} />

        <div className="py-14 grid gap-12 lg:grid-cols-[1fr_360px] border-t-2 border-neutral-900">
          <div data-blocks className="space-y-14">{mainBlocks.map((b, i) => <Block key={i} block={b} jobId={jobId} origin={site.origin} />)}</div>
          <aside className="space-y-6 lg:sticky lg:top-24 self-start">
            {contact && <Block block={contact} jobId={jobId} origin={site.origin} />}
            <div className="border-t-2 border-neutral-900 pt-4">
              <h2 className={`${eyebrow} text-neutral-500`}>About {agency.short_name}</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-neutral-700">{agency.description}</p>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

export function ContentPage({ site, page }: { site: SiteModel; page: SitePage }) {
  const { jobId } = site;
  const parent = site.nav.find((n) => n.slug === page.slug || n.children.some((c) => c.slug === page.slug));
  const siblings = parent ? [parent, ...parent.children].filter((x) => x.slug) : [];
  const headings = page.blocks.map((b) => b.heading).filter(Boolean);
  const hub = (site.hubs ?? []).find((h) => h.slug === page.slug);
  const contact = site.pages.find((p) => p.slug === "home")?.blocks.find((b) => b.type === "contact");
  // Pages that were empty on the original site ("under construction", a lone sentence) get an honest notice instead of the stub.
  const bodyText = page.blocks.map((b) => [b.heading, b.body_markdown, ...b.items.flatMap((it) => [it.title, it.description, it.meta])].join(" ")).join(" ").replace(/\s+/g, " ").trim();
  const stub = /under\s*constr?[au]ction|coming soon|page (is )?(not available|under development)/i.test(bodyText) || bodyText.length < 60;
  const stubText = bodyText.length <= 80 ? bodyText : bodyText.slice(0, 77) + "…";
  const isArchive = /web\.archive\.org/.test(page.source_url ?? "");
  return (
    <>
      <div className="border-b-2 border-neutral-900 bg-white">
        <div className="container-gov py-10 lg:py-14">
          <nav aria-label="Breadcrumb" className={`${eyebrow} text-neutral-500 flex flex-wrap gap-2`}>
            <Link href={navHref(jobId, "home")} className="hover:text-kapwa-brand-900">Home</Link>
            {parent && parent.slug !== page.slug && <><span aria-hidden className="text-neutral-500">/</span><Link href={navHref(jobId, parent.slug)} className="hover:text-kapwa-brand-900">{parent.label}</Link></>}
            <span aria-hidden className="text-neutral-500">/</span><span className="text-neutral-900">{page.title}</span>
          </nav>
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_minmax(0,32rem)] lg:gap-16 items-end">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-[-0.02em] leading-[1.0] text-neutral-900">{page.hero.heading || page.title}</h1>
            <p className="text-lg leading-relaxed text-neutral-600 lg:border-l lg:border-neutral-300 lg:pl-6">{page.hero.subheading || page.summary}</p>
          </div>
        </div>
      </div>
      <div className="container-gov py-12 grid gap-12 lg:grid-cols-[240px_1fr_280px]">
        <aside className="hidden lg:block self-start sticky top-24">
          {siblings.length > 1 && (<><h2 className={`${eyebrow} text-neutral-500 border-b border-neutral-900 pb-2`}>{parent?.label}</h2>
            <ul className="mt-2 divide-y divide-neutral-100">
              {siblings.map((s) => <li key={s.slug}><Link href={navHref(jobId, s.slug)} aria-current={s.slug === page.slug ? "page" : undefined} className={`block py-2 text-sm ${s.slug === page.slug ? "text-kapwa-brand-900 font-semibold pl-3 border-l-2 border-kapwa-brand-900" : "text-neutral-600 hover:text-neutral-900 hover:pl-1 transition-[padding]"}`}>{s.label}</Link></li>)}
            </ul></>)}
        </aside>
        <article data-blocks className="min-w-0 space-y-12">
          {hub && hub.slugs.length > 0 && (
            <section>
              <h2 className={`${eyebrow} text-neutral-500 border-b border-neutral-900 pb-2 mb-4`}>{hub.heading || "In this section"}</h2>
              <ul className="grid border-t border-l border-neutral-200 *:border-r *:border-b *:border-neutral-200 sm:grid-cols-2 xl:grid-cols-3">
                {hub.slugs.map((s, i) => <li key={s}><Link href={navHref(jobId, s)} className="flex gap-3 bg-white px-4 py-4 h-full font-medium text-neutral-900 hover:bg-kapwa-brand-50 hover:text-kapwa-brand-900"><span className="text-xs font-semibold tabular-nums text-neutral-500 pt-1">{nn(i)}</span>{slugTitle(site, s)}</Link></li>)}
              </ul>
            </section>
          )}
          {stub ? (
            <section className="border-l-4 border-kapwa-yellow-400 bg-kapwa-yellow-50 p-6">
              <h2 className={`${eyebrow} text-neutral-600`}>Not yet migrated</h2>
              <p className="mt-2 text-[17px] leading-relaxed text-neutral-800">The original page had no real content{isArchive ? " in the archived copy the agent rebuilt from" : ""}{stubText && <> (it read &ldquo;{stubText}&rdquo;)</>}. The page is kept so the site structure stays complete; an editor can write it in a few minutes.</p>
              {page.source_url && <a className="mt-4 inline-block border-b-2 border-neutral-900 font-semibold text-neutral-900 hover:text-kapwa-brand-900" href={page.source_url} target="_blank" rel="noreferrer">Check the original page ↗</a>}
            </section>
          ) : (
            <>
              {page.blocks.map((b, i) => <Block key={i} block={b} jobId={jobId} origin={site.origin} />)}
              {page.blocks.length === 0 && <Markdown text={page.summary} jobId={jobId} origin={site.origin} />}
            </>
          )}
        </article>
        <aside className="space-y-8 self-start lg:sticky lg:top-24">
          {headings.length > 1 && (<div><h2 className={`${eyebrow} text-neutral-500 border-b border-neutral-900 pb-2`}>On this page</h2><ol className="mt-2 divide-y divide-neutral-100 text-sm text-neutral-600">{headings.map((h, i) => <li key={h} className="flex gap-3 py-2"><span className="text-xs font-semibold tabular-nums text-neutral-500 pt-0.5">{nn(i)}</span>{h}</li>)}</ol></div>)}
          {contact && <Block block={contact} jobId={jobId} origin={site.origin} />}
        </aside>
      </div>
    </>
  );
}
