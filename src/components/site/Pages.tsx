import Link from "next/link";
import type { SiteModel, SitePage } from "@/pipeline/schema";
import { Block } from "./Blocks";
import { Markdown } from "./Markdown";
import { navHref } from "./Shell";

const slugTitle = (site: SiteModel, slug: string) => site.pages.find((p) => p.slug === slug)?.title ?? slug;
const slugSummary = (site: SiteModel, slug: string) => site.pages.find((p) => p.slug === slug)?.summary ?? "";

export function HomePage({ site, page }: { site: SiteModel; page: SitePage }) {
  const { jobId, agency } = site;
  const hero = page.hero;
  const mainBlocks = page.blocks.filter((b) => b.type !== "contact");
  const contact = page.blocks.find((b) => b.type === "contact");
  return (
    <>
      <section className="relative overflow-hidden bg-[radial-gradient(ellipse_at_top_left,var(--color-kapwa-brand-700),var(--color-kapwa-brand-950)_60%)] text-white">
        <div className="absolute inset-0 opacity-[0.07] bg-[linear-gradient(90deg,white_1px,transparent_1px),linear-gradient(white_1px,transparent_1px)] bg-[size:48px_48px]" aria-hidden />
        <div className="relative container-gov py-16 lg:py-24 grid gap-12 lg:grid-cols-[1.1fr_.9fr] items-center">
          <div>
            <p className="text-kapwa-yellow-300 font-semibold tracking-wide text-sm uppercase">{agency.parent}</p>
            <h1 className="mt-3 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05]">{agency.name}</h1>
            <p className="mt-5 text-lg sm:text-xl text-white/85 max-w-xl">{agency.tagline}</p>
            <form role="search" className="mt-8 flex max-w-xl rounded-full bg-white p-1.5 shadow-xl">
              <input aria-label="Search services and information" placeholder="Search services, forms, offices…" className="flex-1 bg-transparent px-4 text-neutral-900 placeholder:text-neutral-400 focus:outline-none" />
              <button type="submit" className="rounded-full bg-kapwa-brand-700 px-6 py-2.5 font-semibold text-white hover:bg-kapwa-brand-800">Search</button>
            </form>
            {hero.heading && hero.heading.trim().toLowerCase() !== agency.name.trim().toLowerCase() && (
              <a href={hero.primary_cta_href || "#"} className="mt-6 inline-flex items-center gap-3 rounded-xl bg-white/10 ring-1 ring-white/20 px-4 py-3 hover:bg-white/15 backdrop-blur">
                <span className="rounded-md bg-kapwa-yellow-400 px-2 py-0.5 text-xs font-bold text-kapwa-brand-950">Featured</span>
                <span className="text-sm sm:text-base"><span className="font-semibold">{hero.heading}</span>{hero.primary_cta_label && <span className="text-white/70"> · {hero.primary_cta_label} →</span>}</span>
              </a>
            )}
          </div>
          <div className="rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur p-6 shadow-2xl">
            <h2 className="text-lg font-semibold">Popular services</h2>
            <ul className="mt-4 grid grid-cols-2 gap-3">
              {site.popular_services.slice(0, 6).map((s) => (
                <li key={s.slug + s.title}>
                  <Link href={navHref(jobId, s.slug)} className="block h-full rounded-xl bg-white/10 hover:bg-white/20 ring-1 ring-white/10 p-4 transition">
                    <span className="block font-semibold leading-snug">{s.title}</span>
                    <span className="mt-1 block text-xs text-white/70 line-clamp-2">{s.description}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <div className="container-gov">
        {site.home_sections.map((sec) => (
          <section key={sec.heading} className="py-14 border-b border-neutral-100 last:border-0">
            <div className="max-w-2xl"><h2 className="text-3xl font-bold tracking-tight text-neutral-900">{sec.heading}</h2>{sec.description && <p className="mt-2 text-neutral-600 text-lg">{sec.description}</p>}</div>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {sec.slugs.map((slug) => (
                <Link key={slug} href={navHref(jobId, slug)} className="group rounded-2xl border-t-4 border-kapwa-brand-600 bg-white p-6 shadow-sm ring-1 ring-neutral-200 hover:shadow-lg hover:-translate-y-0.5 transition">
                  <h3 className="text-lg font-semibold text-neutral-900 group-hover:text-kapwa-brand-900">{slugTitle(site, slug)}</h3>
                  <p className="mt-2 text-sm text-neutral-600 line-clamp-3">{slugSummary(site, slug)}</p>
                  <span className="mt-4 inline-block text-sm font-semibold text-kapwa-brand-700">Read more →</span>
                </Link>
              ))}
            </div>
          </section>
        ))}

        {site.news.length > 0 && (
          <section className="py-14 border-b border-neutral-100">
            <h2 className="text-3xl font-bold tracking-tight">News and updates</h2>
            <ul className="mt-8 grid gap-5 md:grid-cols-2">
              {site.news.slice(0, 4).map((n) => (
                <li key={n.href}><a href={n.href} className="block rounded-2xl ring-1 ring-neutral-200 p-6 hover:ring-kapwa-brand-400 transition"><time className="text-xs font-semibold uppercase tracking-wider text-kapwa-brand-700">{n.date.slice(0, 10)}</time><h3 className="mt-1 font-semibold text-neutral-900" dangerouslySetInnerHTML={{ __html: n.title }} /><p className="mt-2 text-sm text-neutral-600 line-clamp-3">{n.excerpt}</p></a></li>
              ))}
            </ul>
          </section>
        )}

        <div className="py-14 grid gap-10 lg:grid-cols-[1fr_360px]">
          <div className="space-y-14">{mainBlocks.map((b, i) => <Block key={i} block={b} jobId={jobId} origin={site.origin} />)}</div>
          <aside className="space-y-6 lg:sticky lg:top-24 self-start">
            {contact && <Block block={contact} jobId={jobId} origin={site.origin} />}
            <div className="rounded-2xl border border-neutral-200 p-6">
              <h2 className="font-semibold text-neutral-900">About {agency.short_name}</h2>
              <p className="mt-2 text-sm text-neutral-600">{agency.description}</p>
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
  return (
    <>
      <div className="bg-kapwa-brand-50/60 border-b border-kapwa-brand-100">
        <div className="container-gov py-10">
          <nav aria-label="Breadcrumb" className="text-sm text-neutral-500 flex gap-2">
            <Link href={navHref(jobId, "home")} className="hover:text-kapwa-brand-900">Home</Link>
            {parent && parent.slug !== page.slug && <><span>/</span><Link href={navHref(jobId, parent.slug)} className="hover:text-kapwa-brand-900">{parent.label}</Link></>}
            <span>/</span><span className="text-neutral-800">{page.title}</span>
          </nav>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-neutral-900">{page.hero.heading || page.title}</h1>
          <p className="mt-3 max-w-3xl text-lg text-neutral-600">{page.hero.subheading || page.summary}</p>
        </div>
      </div>
      <div className="container-gov py-12 grid gap-12 lg:grid-cols-[240px_1fr_280px]">
        <aside className="hidden lg:block self-start sticky top-24">
          {siblings.length > 1 && (<><h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{parent?.label}</h2>
            <ul className="mt-3 space-y-1 border-l border-neutral-200">
              {siblings.map((s) => <li key={s.slug}><Link href={navHref(jobId, s.slug)} aria-current={s.slug === page.slug ? "page" : undefined} className={`block -ml-px border-l-2 pl-3 py-1.5 text-sm ${s.slug === page.slug ? "border-kapwa-brand-700 text-kapwa-brand-900 font-semibold" : "border-transparent text-neutral-600 hover:text-neutral-900 hover:border-neutral-300"}`}>{s.label}</Link></li>)}
            </ul></>)}
        </aside>
        <article className="min-w-0 space-y-12">
          {hub && hub.slugs.length > 0 && (
            <section>
              <h2 className="text-2xl font-semibold tracking-tight text-neutral-900 mb-4">{hub.heading || "In this section"}</h2>
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {hub.slugs.map((s) => <li key={s}><Link href={navHref(jobId, s)} className="block rounded-xl ring-1 ring-neutral-200 px-4 py-3 font-medium text-neutral-900 hover:ring-kapwa-brand-400 hover:text-kapwa-brand-900">{slugTitle(site, s)}</Link></li>)}
              </ul>
            </section>
          )}
          {page.blocks.map((b, i) => <Block key={i} block={b} jobId={jobId} origin={site.origin} />)}
          {page.blocks.length === 0 && <Markdown text={page.summary} jobId={jobId} origin={site.origin} />}
        </article>
        <aside className="space-y-6 self-start lg:sticky lg:top-24">
          {headings.length > 1 && (<div><h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">On this page</h2><ul className="mt-3 space-y-2 text-sm text-neutral-600">{headings.map((h) => <li key={h}>{h}</li>)}</ul></div>)}
          {contact && <Block block={contact} jobId={jobId} origin={site.origin} />}
        </aside>
      </div>
    </>
  );
}
