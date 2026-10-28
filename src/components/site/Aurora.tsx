import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type { SiteModel, SitePage } from "@/pipeline/schema";
import { navHref, langHref } from "./Shell";
import { MobileNav } from "./MobileNav";
import { AuroraMenu } from "./AuroraMenu";
import { Block } from "./Blocks";
import { Markdown } from "./Markdown";
import { t } from "./i18n";

/**
 * Art-directed sites (src/pipeline/artDirect.ts): refined sites whose homepage Muse Spark composed
 * in the style of a product landing page, with a Muse Image backdrop. Every word and figure comes
 * from the site; colours come from its own brand. This file is the whole look: header, homepage,
 * inner pages. Text stays at AA contrast on the pale canvas.
 */

type Block_ = SitePage["blocks"][number];
const nn = (i: number) => String(i + 1).padStart(2, "0");
const anchor = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const glass = "border border-white bg-white/70 shadow-[0_30px_80px_-45px_color-mix(in_oklab,var(--au-deep)_55%,transparent)] backdrop-blur-xl";
// Brand colour into a deeper shade of it: both ends stay well above 4.5:1 on the pale canvas.
const grad = "bg-[linear-gradient(95deg,var(--au-deep)_0%,color-mix(in_oklab,var(--au-deep)_55%,var(--au-ink))_100%)] bg-clip-text text-transparent";
// The wide drafting margins start at xl; at 1024-1279px they left the text too narrow.
const pad = "px-4 sm:px-8 lg:pl-[150px] lg:pr-16 xl:pl-[200px] xl:pr-[216px]";

export function auroraVars(site: SiteModel): CSSProperties {
  const p = site.design!.art!.palette;
  return { "--au-canvas": p.canvas, "--au-haze": p.haze, "--au-deep": p.deep, "--au-accent": p.accent, "--au-ink": p.ink } as CSSProperties;
}

/** The dot-on-a-line motif from the masthead, reused as a section divider. */
function Rule({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`relative h-px bg-[var(--au-ink)]/15 ${className}`}><span className="absolute -left-[4px] -top-[4px] size-[9px] rounded-full bg-[var(--au-ink)]" /></div>;
}

function SectionHead({ n, kicker, title, body }: { n: number; kicker?: string; title: string; body?: string }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-end lg:gap-16">
      <div>
        <p className="flex items-center gap-3 text-[15px] text-[var(--au-ink)]/70"><span className="tabular-nums">{nn(n)}</span><span aria-hidden className="h-px w-8 bg-[var(--au-ink)]/30" />{kicker}</p>
        <h2 className="mt-5 max-w-[18ch] text-[clamp(2.2rem,4.6vw,4.4rem)] font-normal leading-[0.98] tracking-[-0.045em]">{title}</h2>
      </div>
      {body && <p className="text-lg leading-relaxed text-[var(--au-ink)]/75">{body}</p>}
    </div>
  );
}

/**
 * Header in place of the template's seal header and blue bar: the logo in a left rail, plain
 * links, a full-screen menu, and a white call-to-action block in the corner. Over the masthead on the
 * homepage (overlay), a light bar on every other page.
 */
export function AuroraNav({ site, here, overlay }: { site: SiteModel; here: string; overlay?: boolean }) {
  const { jobId } = site;
  const art = site.design!.art!;
  const logo = site.assets.logo ? `/api/jobs/${jobId}/${site.assets.logo}?v=${encodeURIComponent(site.generated_at)}` : null;
  const items = site.nav.filter((n) => n.slug !== "home" && (n.slug || n.children.length > 0)).map((n) => ({ ...n, href: navHref(jobId, n.slug || n.children[0].slug) }));
  const has = (slug: string) => site.pages.some((p) => p.slug === slug);
  const fil = site.lang === "fil";
  return (
    <header className={`refined ${overlay ? "absolute inset-x-0 top-0" : "relative border-b border-[var(--au-ink)]/12 bg-[var(--au-canvas)]"} z-30 text-[var(--au-ink)]`} style={auroraVars(site)}>
      <div className="flex h-20 items-stretch lg:h-[107px]">
        <Link href={navHref(jobId, "home")} className="flex shrink-0 items-center justify-center px-4 lg:w-[100px]" aria-label={`${site.agency.short_name} home`}>
          {logo
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={logo} alt="" className="h-9 w-auto max-w-[84px] object-contain" />
            : <span className="font-bold">{site.agency.short_name}</span>}
        </Link>
        <nav aria-label="Primary" className="hidden flex-1 items-center gap-8 whitespace-nowrap pl-12 text-[17px] tracking-[-0.01em] [overflow-wrap:normal] lg:flex xl:gap-12 xl:pl-[100px] xl:text-[19px]">
          {items.slice(0, 5).map((n) => <Link key={n.label} href={n.href} className="hover:text-[var(--au-deep)]">{n.label}</Link>)}
        </nav>
        <div className="ml-auto flex items-stretch">
          <a href={langHref(fil ? "en" : "fil", here)} lang={fil ? "en" : "fil"} hrefLang={fil ? "en" : "fil"} className="hidden items-center px-6 text-[15px] hover:text-[var(--au-deep)] sm:flex">{fil ? "English" : "Filipino"}</a>
          <AuroraMenu {...menuProps(site, here)} />
          <Link href={navHref(jobId, has(art.corner_cta.slug) ? art.corner_cta.slug : "home")} className="flex items-center gap-3 bg-white px-5 text-sm font-semibold uppercase tracking-[0.02em] hover:bg-[var(--au-haze)] sm:px-8 lg:w-[240px] lg:justify-center lg:whitespace-nowrap xl:w-[320px] xl:text-[19px]">{art.corner_cta.label}<span aria-hidden>↓</span></Link>
        </div>
      </div>
      <div aria-hidden className="pointer-events-none absolute bottom-0 left-[100px] right-[240px] hidden h-px xl:right-[320px] bg-[var(--au-ink)]/15 lg:block">
        <span className="absolute -left-[4px] -top-[4px] size-[9px] rounded-full bg-[var(--au-ink)]" />
      </div>
      <MobileNav nav={site.nav} jobId={jobId} lang={site.lang} />
    </header>
  );
}

/** Props for the full-screen menu opened from the header. */
function menuProps(site: SiteModel, here: string) {
  const { jobId } = site;
  const art = site.design!.art!;
  const fil = site.lang === "fil";
  return {
    items: site.nav.filter((n) => n.slug || n.children.length).map((n) => ({ label: n.label, href: n.slug ? navHref(jobId, n.slug) : undefined, children: n.children.filter((c) => c.slug).map((c) => ({ label: c.label, href: navHref(jobId, c.slug) })) })),
    extras: [{ label: t(site.lang, "Emergency hotlines"), href: navHref(jobId, "hotlines") }, { label: fil ? "English" : "Filipino", href: langHref(fil ? "en" : "fil", here) }],
    cta: { label: art.corner_cta.label, href: navHref(jobId, site.pages.some((p) => p.slug === art.corner_cta.slug) ? art.corner_cta.slug : "home") },
    search: { action: navHref(jobId, "search"), placeholder: t(site.lang, "Search or ask a question…") },
    label: t(site.lang, "Menu"),
    vars: auroraVars(site),
  };
}

function Masthead({ site, here }: { site: SiteModel; here: string }) {
  const art = site.design!.art!;
  const { jobId } = site;
  const v = encodeURIComponent(site.generated_at);
  const src = (p: string) => `/api/jobs/${jobId}/${p}?v=${v}`;
  const href = (slug: string) => navHref(jobId, site.pages.some((p) => p.slug === slug) ? slug : "about");
  // The site's own hero line in sentence case, its closing sentence in the brand colour; Spark's short lines if it has none.
  const own = site.pages.find((p) => p.slug === "home")?.hero.heading ?? "";
  const sentences = own && own.length <= 70 ? own.match(/[^.!?]+[.!?]*/g)!.map((x) => x.trim()) : [art.headline.map((l) => l.text).join(" ")];
  const tail = sentences.length > 1 ? sentences.pop()! : "";
  return (
    <div className="relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src(art.image)} alt="" aria-hidden className="absolute inset-x-0 top-0 h-[460px] w-full object-cover object-[30%_center] sm:h-[600px] lg:inset-x-auto lg:bottom-0 lg:left-0 lg:top-auto lg:h-[64%] lg:w-auto lg:max-w-none lg:object-contain lg:[mask-image:radial-gradient(ellipse_62%_58%_at_32%_55%,black_45%,transparent_100%)]" />
      <div aria-hidden className="absolute inset-x-0 top-[300px] h-[160px] bg-gradient-to-b from-transparent to-[var(--au-canvas)] sm:top-[440px] lg:hidden" />
      {/* A light veil so the lede and stat read cleanly over the icons */}
      <div aria-hidden className="absolute inset-0 hidden bg-[linear-gradient(90deg,color-mix(in_oklab,var(--au-canvas)_25%,transparent)_0%,color-mix(in_oklab,var(--au-canvas)_55%,transparent)_30%,transparent_55%)] lg:block" />
      <AuroraNav site={site} here={here} overlay />

      <div className={`relative pt-[470px] sm:pt-[610px] lg:pb-24 lg:pt-[200px] xl:pt-[230px] ${pad}`}>
        <p className="sr-only">{site.agency.parent}</p>
        {/* Headline with the lede beside it, bottom-aligned */}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,14rem)] lg:items-end lg:gap-12">
          <h1 className="text-[clamp(3rem,5.3vw,6.6rem)] font-medium leading-[0.95] tracking-[-0.045em] text-[var(--au-ink)] [overflow-wrap:normal]">
            {sentences.join(" ")}{tail && <> <span className="whitespace-nowrap text-[var(--au-deep)]">{tail}</span></>}
          </h1>
          <p className="text-xl font-medium leading-[1.25] tracking-[-0.01em] text-[var(--au-ink)]/80 lg:mb-2 lg:border-l lg:border-[var(--au-ink)]/20 lg:pl-6">{art.lede}</p>
        </div>

        <div className="mt-12 grid gap-10 lg:mt-28 lg:grid-cols-[minmax(0,1fr)_minmax(0,min(818px,52vw))]">
          <div className="flex flex-col">
            <div className="relative lg:mt-auto lg:pt-16">
              <Rule className="-ml-[50px] hidden w-[100vw] lg:block xl:-ml-[100px]" />
              <p className="lg:mt-14">
                <span className="block whitespace-nowrap text-7xl font-normal leading-none tracking-[-0.05em] lg:text-[5.4rem]">{art.stat.value}</span>
                <span className="mt-3 block text-lg">{art.stat.label}</span>
              </p>
            </div>
          </div>

          <div className="relative grid gap-5 sm:grid-cols-2 lg:gap-[18px]">
            <div className={`flex flex-col p-7 lg:min-h-[550px] ${glass}`}>
              <h2 className="text-[26px] font-medium leading-tight tracking-[-0.02em]">{art.card.title}</h2>
              <p className="mt-3 text-[4.2rem] font-normal leading-none tracking-[-0.06em]">{art.card.value}</p>
              <ul className="mt-10 space-y-11 text-[19px] text-[var(--au-ink)]/75">
                {art.card.shifts.slice(0, 3).map((s, i) => (
                  <li key={s.from + s.to} className="grid grid-cols-[4.5rem_1fr_4.5rem] items-center gap-3">
                    <span>{s.from}</span>
                    <span aria-hidden className="relative h-px bg-[var(--au-ink)]/20"><span className="absolute -top-[7px] size-[15px] rounded-full bg-[var(--au-deep)] shadow-[0_0_18px_7px_color-mix(in_oklab,var(--au-deep)_40%,transparent)]" style={{ left: `${[74, 66, 80][i]}%` }} /></span>
                    <span className="text-right">{s.to}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-10 flex items-center gap-4 bg-[var(--au-haze)]/70 px-6 py-4 text-[19px] tracking-[-0.01em] lg:mt-auto"><span aria-hidden className="text-xl text-[var(--au-deep)]">✦</span>{art.card.note}</p>
            </div>
            <Link href={href(art.feature.slug)} className="group relative flex min-h-[26rem] flex-col overflow-hidden bg-[linear-gradient(175deg,var(--au-haze)_0%,color-mix(in_oklab,var(--au-haze)_60%,white)_100%)] p-7 shadow-[0_30px_80px_-45px_color-mix(in_oklab,var(--au-deep)_55%,transparent)] lg:min-h-[550px]">
              <span className="flex items-start justify-between gap-6 text-[26px] font-medium leading-[1.15] tracking-[-0.02em]">{art.feature.title}<span aria-hidden className="text-xl transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5">↗</span></span>
              {site.design?.hero && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src(site.design.hero)} alt="" className="mt-auto max-h-[22rem] w-full object-contain object-bottom mix-blend-multiply" />
              )}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

const unshown = (d: string) => /^answer not shown/i.test(d);

/** One homepage section per block of the original homepage, each in a layout that suits its kind. */
function HomeSection({ site, b, n, last }: { site: SiteModel; b: Block_; n: number; last: boolean }): ReactNode {
  const { jobId } = site;
  const id = anchor(b.heading);
  const art = site.design!.art!;
  if (b.type === "callout" && last) {
    return (
      <section id={id} className={`py-24 ${pad}`}>
        <div className="relative overflow-hidden bg-[var(--au-deep)] px-8 py-16 text-white sm:px-14 lg:py-24">
          <div aria-hidden className="absolute -right-24 -top-24 size-[28rem] rounded-full bg-white/10 blur-2xl" />
          <div aria-hidden className="absolute -bottom-40 left-1/3 size-[30rem] rounded-full bg-[var(--au-accent)]/25 blur-3xl" />
          <h2 className="relative max-w-[16ch] text-[clamp(2.4rem,5vw,5rem)] font-normal leading-[0.95] tracking-[-0.045em]">{b.heading}</h2>
          {b.body_markdown && <div className="relative mt-8 max-w-2xl text-lg leading-relaxed text-white/85 [&_*]:!text-white/85 [&_a]:underline"><Markdown text={b.body_markdown} jobId={jobId} origin={site.origin} /></div>}
          <Link href={navHref(jobId, site.pages.some((p) => p.slug === art.corner_cta.slug) ? art.corner_cta.slug : "about")} className="relative mt-10 inline-flex items-center gap-3 bg-white px-8 py-4 font-semibold uppercase tracking-[0.02em] text-[var(--au-ink)] hover:bg-[var(--au-haze)]">{art.corner_cta.label}<span aria-hidden>↓</span></Link>
        </div>
      </section>
    );
  }
  if (b.type === "callout") {
    return (
      <section id={id} className={`relative py-24 lg:py-32 ${pad}`}>
        <Rule className="mb-16 -ml-[50px] hidden w-[calc(100%+114px)] lg:block xl:-ml-[100px] xl:w-[calc(100%+316px)]" />
        <p className="max-w-[22ch] text-[clamp(2rem,4.4vw,4.2rem)] font-normal leading-[1.02] tracking-[-0.045em]"><span className={grad}>{b.heading}</span></p>
        {b.body_markdown && <div className="mt-8 max-w-2xl text-xl leading-relaxed text-[var(--au-ink)]/75"><Markdown text={b.body_markdown} jobId={jobId} origin={site.origin} /></div>}
      </section>
    );
  }
  if (b.type === "steps") {
    return (
      <section id={id} className={`py-24 ${pad}`}>
        <SectionHead n={n} kicker={t(site.lang, "How it works")} title={b.heading} body={b.body_markdown} />
        <ol className="mt-16 grid gap-10 md:grid-cols-3 md:gap-6">
          {b.items.map((it, i) => (
            <li key={it.title}>
              <div aria-hidden className="relative h-px bg-[var(--au-ink)]/15"><span className="absolute -top-[7px] size-[15px] rounded-full bg-[var(--au-deep)] shadow-[0_0_18px_7px_color-mix(in_oklab,var(--au-deep)_35%,transparent)]" style={{ left: `${20 + i * 25}%` }} /></div>
              <p className="mt-10 text-[5rem] font-normal leading-none tracking-[-0.06em] text-[var(--au-deep)]">{it.meta || nn(i)}</p>
              <h3 className="mt-6 text-2xl font-medium tracking-[-0.02em]">{it.title}</h3>
              <p className="mt-3 text-[17px] leading-relaxed text-[var(--au-ink)]/75">{it.description}</p>
            </li>
          ))}
        </ol>
      </section>
    );
  }
  if (b.type === "list") {
    return (
      <section id={id} className={`relative overflow-hidden bg-[var(--au-ink)] py-24 text-white lg:py-32 ${pad}`}>
        <div aria-hidden className="absolute -left-40 top-10 size-[36rem] rounded-full bg-[var(--au-deep)]/45 blur-3xl" />
        <div className="relative grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-20">
          <div>
            <p className="flex items-center gap-3 text-[15px] text-white/70"><span className="tabular-nums">{nn(n)}</span><span aria-hidden className="h-px w-8 bg-white/30" />{t(site.lang, "Security")}</p>
            <h2 className="mt-5 text-[clamp(2.2rem,4.6vw,4.4rem)] font-normal leading-[0.98] tracking-[-0.045em]">{b.heading}</h2>
            {b.body_markdown && <p className="mt-6 max-w-md text-lg leading-relaxed text-white/75">{b.body_markdown}</p>}
          </div>
          <ul className="grid gap-px self-end bg-white/15 sm:grid-cols-2">
            {b.items.map((it) => (
              <li key={it.title} className="bg-[var(--au-ink)] p-7">
                <span aria-hidden className="block size-2.5 rounded-full bg-[var(--au-accent)] shadow-[0_0_14px_5px_color-mix(in_oklab,var(--au-accent)_45%,transparent)]" />
                <h3 className="mt-6 text-xl font-medium tracking-[-0.01em]">{it.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-white/70">{it.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }
  if (b.type === "faq") {
    const faqSlug = site.pages.find((p) => p.page_type === "faq")?.slug;
    return (
      <section id={id} className={`py-24 ${pad}`}>
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
          <div>
            <p className="flex items-center gap-3 text-[15px] text-[var(--au-ink)]/70"><span className="tabular-nums">{nn(n)}</span><span aria-hidden className="h-px w-8 bg-[var(--au-ink)]/30" />FAQ</p>
            <h2 className="mt-5 text-[clamp(2.2rem,4.6vw,4.4rem)] font-normal leading-[0.98] tracking-[-0.045em]">{b.heading}</h2>
            {b.body_markdown && <p className="mt-6 text-lg text-[var(--au-ink)]/75">{b.body_markdown}</p>}
            {faqSlug && <Link href={navHref(jobId, faqSlug)} className="mt-8 inline-flex items-center gap-2 border-b border-[var(--au-ink)] pb-1 font-medium hover:text-[var(--au-deep)]">{t(site.lang, "All questions")} <span aria-hidden>↗</span></Link>}
          </div>
          <ul className="border-t border-[var(--au-ink)]/15">
            {b.items.map((it) => (
              <li key={it.title} className="border-b border-[var(--au-ink)]/15">
                {unshown(it.description) && faqSlug
                  ? <Link href={navHref(jobId, faqSlug)} className="flex items-center justify-between gap-6 py-6 text-xl font-medium tracking-[-0.01em] hover:text-[var(--au-deep)]">{it.title}<span aria-hidden className="text-[var(--au-ink)]/70">↗</span></Link>
                  : <details className="group py-6">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-xl font-medium tracking-[-0.01em] [&::-webkit-details-marker]:hidden">{it.title}<span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--au-haze)] text-lg transition group-open:rotate-45">+</span></summary>
                      <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-[var(--au-ink)]/75">{it.description}</p>
                    </details>}
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }
  if (b.type === "cards" && b.items.length > 0) {
    const few = b.items.length <= 3;
    return (
      <section id={id} className={`py-24 ${pad}`}>
        <SectionHead n={n} kicker={few ? t(site.lang, "Why") : t(site.lang, "Features")} title={b.heading} body={b.body_markdown} />
        <ul className={`mt-16 grid gap-[18px] sm:grid-cols-2 ${few ? "lg:grid-cols-3" : "lg:grid-cols-3"}`}>
          {b.items.map((it, i) => {
            const inner = (
              <>
                <span className="flex items-center justify-between text-sm tabular-nums text-[var(--au-ink)]/70">{nn(i)}{it.href && <span aria-hidden>↗</span>}</span>
                <h3 className={`mt-10 font-medium leading-snug tracking-[-0.02em] ${few ? "text-[28px]" : "text-[22px]"}`}>{it.title}</h3>
                <p className="mt-3 text-[16px] leading-relaxed text-[var(--au-ink)]/75">{it.description}</p>
              </>
            );
            return <li key={it.title} className={few ? "border-t border-[var(--au-ink)]/20 pt-6" : `p-7 ${glass}`}>{it.href ? <a href={it.href} className="block hover:text-[var(--au-deep)]">{inner}</a> : inner}</li>;
          })}
        </ul>
      </section>
    );
  }
  if (b.type === "links") return null; // the footer carries these
  return (
    <section id={id} className={`aurora-body py-16 ${pad}`}>
      <Block block={b} jobId={jobId} origin={site.origin} lang={site.lang} portraits={site.portraits} />
    </section>
  );
}

function News({ site, n }: { site: SiteModel; n: number }) {
  const posts = site.pages.filter((p) => p.page_type === "news" && p.slug.includes("/")).slice(0, 3);
  const hub = site.pages.find((p) => p.slug === "news");
  if (!posts.length) return null;
  return (
    <section id="news" className={`py-24 ${pad}`}>
      <SectionHead n={n} kicker={t(site.lang, "News")} title={hub?.title && hub.title !== "News" ? hub.title : t(site.lang, "Latest news")} body={hub?.summary} />
      <ul className="mt-16 grid gap-[18px] md:grid-cols-3">
        {posts.map((p) => (
          <li key={p.slug}>
            <Link href={navHref(site.jobId, p.slug)} className={`group flex h-full flex-col p-7 ${glass} hover:bg-white`}>
              <span className="text-sm text-[var(--au-ink)]/70">{p.section || t(site.lang, "News")}</span>
              <h3 className="mt-8 text-[22px] font-medium leading-snug tracking-[-0.02em] group-hover:text-[var(--au-deep)]">{p.title}</h3>
              <p className="mt-3 line-clamp-3 text-[16px] leading-relaxed text-[var(--au-ink)]/75">{p.summary}</p>
              <span aria-hidden className="mt-auto pt-8 text-lg">↗</span>
            </Link>
          </li>
        ))}
      </ul>
      {hub && <Link href={navHref(site.jobId, "news")} className="mt-10 inline-flex items-center gap-2 border-b border-[var(--au-ink)] pb-1 font-medium hover:text-[var(--au-deep)]">{t(site.lang, "All news")} <span aria-hidden>↗</span></Link>}
    </section>
  );
}

/** The whole homepage of an art-directed site: masthead, then the original homepage's own sections. */
export function AuroraHome({ site, page, here }: { site: SiteModel; page: SitePage; here: string }) {
  const blocks = page.blocks.filter((b) => b.type !== "contact");
  const lastCallout = blocks.map((b) => b.type).lastIndexOf("callout");
  // News goes just before the FAQ (or at the end); sections are numbered in the order they show.
  const order: (number | "news")[] = blocks.map((_, i) => i);
  const faqAt = blocks.findIndex((b) => b.type === "faq");
  order.splice(faqAt >= 0 ? faqAt : order.length, 0, "news");
  let n = 0;
  return (
    <div className="refined aurora relative overflow-hidden bg-[var(--au-canvas)] text-[var(--au-ink)]" style={auroraVars(site)}>
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-[100px] z-10 hidden w-px bg-[var(--au-ink)]/12 lg:block" />
      <Masthead site={site} here={here} />
      {order.map((o) => {
        if (o === "news") return <News key="news" site={site} n={n++} />;
        const b = blocks[o];
        return <HomeSection key={o} site={site} b={b} n={b.type === "callout" || b.type === "links" ? 0 : n++} last={o === lastCallout} />;
      })}
    </div>
  );
}

/** Inner pages of an art-directed site: a light page head on the rail, then the page's blocks restyled. */
export function AuroraPage({ site, page, children }: { site: SiteModel; page: SitePage; children: ReactNode }) {
  const parent = site.nav.find((n) => n.slug === page.slug || n.children.some((c) => c.slug === page.slug));
  return (
    <div className="refined aurora relative overflow-hidden bg-[var(--au-canvas)] text-[var(--au-ink)]" style={auroraVars(site)}>
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-[100px] hidden w-px bg-[var(--au-ink)]/12 lg:block" />
      <div aria-hidden className="absolute -right-40 -top-40 size-[40rem] rounded-full bg-[var(--au-haze)] blur-3xl" />
      <div className={`relative pb-16 pt-14 lg:pb-20 lg:pt-20 ${pad}`}>
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-[15px] text-[var(--au-ink)]/70">
          <Link href={navHref(site.jobId, "home")} className="hover:text-[var(--au-deep)]">{t(site.lang, "Home")}</Link>
          {parent && parent.slug !== page.slug && <><span aria-hidden className="h-px w-5 bg-[var(--au-ink)]/30" /><Link href={navHref(site.jobId, parent.slug)} className="hover:text-[var(--au-deep)]">{parent.label}</Link></>}
          <span aria-hidden className="h-px w-5 bg-[var(--au-ink)]/30" /><span className="text-[var(--au-ink)]">{page.title}</span>
        </nav>
        <h1 className="mt-10 max-w-[16ch] text-[clamp(2.6rem,6.4vw,6.6rem)] font-normal leading-[0.92] tracking-[-0.055em]"><span className={grad}>{page.hero.heading || page.title}</span></h1>
        {(page.hero.subheading || page.summary) && <p className="mt-8 max-w-2xl text-xl leading-relaxed text-[var(--au-ink)]/75">{page.hero.subheading || page.summary}</p>}
      </div>
      <Rule className="-ml-0 hidden lg:ml-[100px] lg:block" />
      <div className="aurora-body relative bg-white/60">{children}</div>
    </div>
  );
}
