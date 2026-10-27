import Link from "next/link";
import { notFound } from "next/navigation";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { JOBS_ROOT, loadSite } from "@/lib/jobs";
import type { CrawlResult } from "@/pipeline/types";
import type { Box } from "@/pipeline/segment";
import { AppHeader, AppFooter, eyebrow, btn, nn } from "@/components/AppShell";
import { PrintButton } from "@/components/PrintButton";

export const dynamic = "force-dynamic";

type Finding = { ref: string; page: string; slug: string; text: string; category: string };

const A11Y_CATEGORIES: [string, RegExp][] = [
  ["Colour contrast", /contrast|legib/i],
  ["Heading structure", /heading|\bh[1-6]\b|hierarch/i],
  ["Images and media", /image|alt(ernative)?\b|icon|slider|carousel|photo|video|infographic/i],
  ["Links and controls", /link|button|control|anchor|read.?more|click here/i],
  ["Forms and labels", /form|label|input|field/i],
  ["Typography", /font|text size|small text|line spacing|all.?caps|serif|readab|justified/i],
  ["Character encoding", /encod|mojibake|Ã|character/i],
  ["Structure and semantics", /table|layout|semantic|landmark|list|navigation|language|lang\b|skip/i],
];
const HUMAN_CATEGORIES: [string, RegExp][] = [
  ["Missing or blank content", /blank|missing|empty|not captured|could not|no .* (listed|captured|found)|retriev|unavailable/i],
  ["Time-sensitive, verify", /wayback|archive|snapshot|time-sensitive|outdated|may have (been )?(updated|changed)|verify|confirm|current/i],
  ["Dropped as site chrome", /dropped|excluded|removed|site chrome|omitted|not migrated/i],
  ["Uncertain extraction", /unclear|ambiguous|assum|guess|inferred|approximat|truncat/i],
];
const categorize = (text: string, cats: [string, RegExp][]) => cats.find(([, re]) => re.test(text))?.[0] ?? "Other";

function collect(pages: { title: string; slug: string }[], pick: (p: { slug: string }) => string[], prefix: string, cats: [string, RegExp][]): Finding[] {
  const out: Finding[] = [];
  for (const p of pages) for (const text of pick(p)) out.push({ ref: `${prefix}-${String(out.length + 1).padStart(2, "0")}`, page: p.title, slug: p.slug, text, category: categorize(text, cats) });
  return out;
}

function tally(items: Finding[], cats: [string, RegExp][]) {
  const names = [...cats.map(([n]) => n), "Other"];
  return names.map((name) => ({ name, count: items.filter((i) => i.category === name).length })).filter((c) => c.count > 0).sort((a, b) => b.count - a.count);
}

/** One report section: number and title in the left column, content on the right (screen and print alike). */
function Sec({ n, title, aside, children }: { n: number; title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mt-14 grid gap-x-12 gap-y-4 border-t border-neutral-300 pt-6 lg:grid-cols-[12rem_1fr] print:mt-8 print:grid-cols-[34mm_1fr] print:gap-x-6 print:pt-4">
      <div>
        <div className="text-[11px] font-semibold tabular-nums text-neutral-500">{nn(n - 1)}</div>
        <h2 className="mt-1 text-2xl font-display font-normal tracking-tight text-neutral-900 print:text-[17pt]">{title}</h2>
        {aside && <div className="mt-2 text-[13px] text-neutral-500">{aside}</div>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

/** A register of findings, grouped by page, with reference numbers. */
function Register({ n, title, deck, items, cats, jobId, tone }: { n: number; title: string; deck: string; items: Finding[]; cats: [string, RegExp][]; jobId: string; tone: "red" | "amber" }) {
  const byPage = new Map<string, Finding[]>();
  for (const it of items) (byPage.get(it.slug) ?? byPage.set(it.slug, []).get(it.slug)!).push(it);
  const groups = [...byPage.values()];
  const counts = tally(items, cats);
  const accent = tone === "red" ? "border-kapwa-red-600" : "border-kapwa-yellow-400";
  const href = (slug: string) => (slug === "home" ? `/preview/${jobId}` : `/preview/${jobId}/${slug}`);
  return (
    <Sec n={n} title={title} aside={<span className="tabular-nums">{items.length} {items.length === 1 ? "finding" : "findings"} across {groups.length} {groups.length === 1 ? "page" : "pages"}</span>}>
      <p className="max-w-3xl text-neutral-700">{deck}</p>

      {counts.length > 0 && (
        <table className="mt-6 w-full text-sm">
          <caption className={`${eyebrow} text-left text-neutral-500 pb-2`}>{nn(n - 1)}.1 — Breakdown by category</caption>
          <thead><tr className="border-b-2 border-kapwa-brand-900 text-left"><th className="py-2 pr-4 font-semibold">Category</th><th className="py-2 px-4 text-right font-semibold tabular-nums w-20">Count</th><th className="py-2 pl-4 font-semibold w-1/2">Share</th></tr></thead>
          <tbody>
            {counts.map((c) => (
              <tr key={c.name} className="border-b border-neutral-200">
                <td className="py-2 pr-4">{c.name}</td>
                <td className="py-2 px-4 text-right tabular-nums">{c.count}</td>
                <td className="py-2 pl-4"><div className="flex items-center gap-3"><div className={`h-2.5 [print-color-adjust:exact] ${tone === "red" ? "bg-kapwa-red-600" : "bg-kapwa-yellow-400"}`} style={{ width: `${Math.max(2, (c.count / items.length) * 100)}%` }} /><span className="text-xs text-neutral-500 tabular-nums">{Math.round((c.count / items.length) * 100)}%</span></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {items.length > 0 ? (
        <div className="mt-8">
          <div className={`${eyebrow} text-neutral-500 pb-2 border-b-2 border-kapwa-brand-900`}>{nn(n - 1)}.2 — Full register</div>
          <div className="2xl:columns-2 2xl:gap-12">
          {groups.map((g) => (
            <div key={g[0].slug} className="break-inside-avoid pt-4 first:pt-0">
              <div className={`flex items-baseline justify-between gap-4 border-l-4 ${accent} bg-neutral-50 px-3 py-2`}>
                <Link href={href(g[0].slug)} className="font-bold text-neutral-900 hover:text-kapwa-brand-900">{g[0].page}</Link>
                <span className="text-xs text-neutral-500 tabular-nums">{g[0].ref}–{g[g.length - 1].ref}</span>
              </div>
              <ol className="divide-y divide-neutral-200 border-b border-neutral-200">
                {g.map((it) => (
                  <li key={it.ref} className="grid grid-cols-[3.25rem_1fr] gap-x-3 py-2 text-[14px] leading-snug">
                    <span className="font-semibold tabular-nums text-neutral-500">{it.ref}</span>
                    <span className="text-neutral-800">{it.text} <span className="whitespace-nowrap text-xs text-neutral-400">· {it.category}</span></span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
          </div>
        </div>
      ) : <p className="mt-6 text-sm text-neutral-500">Nothing recorded.</p>}
    </Sec>
  );
}

function Seal({ src, alt }: { src: string; alt: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className="max-h-24" />;
}

const COLORS: Record<string, string> = { logo: "#fcd116", "navigation menu": "#35b0ff", banner: "#ff6878", sidebar: "#3deb8e", footer: "#fdad3a" };

export default async function Report({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const site = await loadSite(jobId);
  if (!site) notFound();
  const crawl = JSON.parse(await readFile(join(JOBS_ROOT, jobId, "crawl.json"), "utf8")) as CrawlResult;
  let segments: Box[] = [];
  try { segments = JSON.parse(await readFile(join(JOBS_ROOT, jobId, "assets/segments.json"), "utf8")); } catch {}
  const home = crawl.pages[0];
  const vw = home.width, vh = 900;
  const a11y = collect(site.pages, (p) => site.pages.find((x) => x.slug === p.slug)!.a11y_issues, "A", A11Y_CATEGORIES);
  const notes = collect(site.pages, (p) => site.pages.find((x) => x.slug === p.slug)!.migration_notes, "H", HUMAN_CATEGORIES);
  const blocks = site.pages.reduce((n, p) => n + p.blocks.length, 0);
  const imageOnly = site.pages.reduce((n, p) => n + p.blocks.filter((b) => b.type === "image").length, 0);
  const host = new URL(site.origin).host;
  const generated = new Date(site.generated_at);
  const a11yPages = new Set(a11y.map((x) => x.slug)).size;
  const notePages = new Set(notes.map((x) => x.slug)).size;
  const logo = site.assets.logo ? `/api/jobs/${jobId}/${site.assets.logo}?v=${encodeURIComponent(site.generated_at)}` : null;
  const pageHref = (slug: string) => (slug === "home" ? `/preview/${jobId}` : `/preview/${jobId}/${slug}`);
  let n = 1;
  const figures: [string | number, string][] = [[crawl.pages.length, "pages crawled"], [site.pages.length, "pages rebuilt"], [blocks, "content blocks"], [a11y.length, "accessibility findings"], [notes.length, "items for human review"], [imageOnly, "image-only sections transcribed"]];

  const meta: [string, string][] = [
    ["Reference", jobId],
    ["Source", crawl.archive ? `Wayback Machine capture, ${crawl.archive.date.slice(0, 10)}` : "Live site"],
    ["Generated", generated.toLocaleString("en-PH", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Manila" })],
    ["Models", "Muse Spark 1.3 · SAM 3.1 · Muse Image"],
    ["Standard", "Kapwa by BetterGov.ph"],
    ["Status", "Unofficial AI-generated concept"],
  ];

  return (
    <>
      {/* Print: A4 pages numbered "n / total" in the bottom-left margin; the letterhead repeats via <thead>. */}
      <style>{`@page { size: A4; margin: 12mm 14mm 16mm; @bottom-left { content: counter(page) " / " counter(pages); font: 600 8pt Inter, sans-serif; color: #525252; } }`}</style>
      <div className="print:hidden"><AppHeader crumb={`Migration report · ${host}`} /></div>
      <main className="relative flex-1 overflow-hidden print:overflow-visible">
        {/* Subtle art at the foot of the report on screen, and of every printed page. */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[22vw] max-h-80 print:fixed print:h-[42mm] print:max-h-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hero-sm.jpg" alt="" className="h-full w-full object-cover object-bottom opacity-[0.09] grayscale-[40%] [mask-image:linear-gradient(to_bottom,transparent_0%,rgba(0,0,0,.35)_35%,black_85%)]" />
        </div>
        <table className="container-gov block max-w-[1400px] pt-10 pb-[18vw] print:table print:w-full print:max-w-none print:p-0">
          <thead className="block print:table-header-group">
            <tr className="block print:table-row"><td className="block print:table-cell print:pb-6">
              {/* Letterhead */}
              <div className="grid grid-cols-[auto_1fr] items-start gap-x-10 gap-y-3 border-b border-neutral-300 pb-5 sm:grid-cols-[auto_1fr_auto] print:grid-cols-[auto_1fr_auto] print:pb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/logo.svg" alt="RE:GOV. Reimagine Government." className="h-11 w-auto print:h-[11mm]" />
                <div className="hidden text-[13px] leading-snug text-neutral-700 sm:block print:block print:text-[8pt]"><div className="font-semibold text-neutral-900">{site.agency.name} · {host}</div><div>Migration report</div></div>
                <div className="justify-self-end text-right text-[13px] leading-snug text-neutral-700 print:text-[8pt]"><div className="font-semibold text-neutral-900">RE:GOV</div><div>regov.app</div></div>
              </div>
            </td></tr>
          </thead>
          <tbody className="block print:table-row-group">
            <tr className="block print:table-row"><td className="block print:table-cell">

          {/* Title block */}
          <div className="mt-10 grid gap-x-12 gap-y-6 lg:grid-cols-[12rem_1fr] print:mt-2 print:grid-cols-[34mm_1fr] print:gap-x-6">
            <p className={`${eyebrow} text-kapwa-brand-900 pt-3`}>Migration report</p>
            <div>
              <h1 className="text-4xl sm:text-5xl font-display font-normal tracking-tight text-neutral-900 print:text-[26pt]">{site.agency.name}</h1>
              <p className="mt-3 max-w-2xl text-lg text-neutral-600 print:text-[11pt]">Automated assessment and rebuild of <a href={site.origin} className="underline decoration-neutral-300 underline-offset-4 hover:decoration-kapwa-brand-900" target="_blank" rel="noreferrer">{host}</a> on the BetterGov Kapwa design standard.</p>
              <div className="mt-6 flex flex-wrap gap-3 print:hidden">
                <Link href={`/preview/${jobId}`} className={btn.primary}>View the rebuilt site →</Link>
                <a href={site.origin} target="_blank" rel="noreferrer" className={btn.ghost}>Original ↗</a>
                <PrintButton className={`${btn.ghost} border-neutral-300 text-neutral-600 hover:border-kapwa-brand-900`} />
              </div>
              <dl className="mt-8 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm sm:grid-cols-[auto_1fr_auto_1fr] print:mt-5 print:grid-cols-[auto_1fr_auto_1fr] print:text-[8.5pt]">
                {meta.map(([k, v]) => <div key={k} className="contents"><dt className={`${eyebrow} text-neutral-500 pt-0.5`}>{k}</dt><dd className="text-neutral-900 break-words">{v}</dd></div>)}
              </dl>
            </div>
          </div>

          <Sec n={n++} title="Overview">
            <p className="max-w-3xl text-lg leading-snug text-neutral-800 print:text-[11pt]">
              The agent {crawl.archive ? `read the ${crawl.archive.date.slice(0, 4)} archived copy of` : "crawled"} <strong className="font-semibold">{host}</strong>, kept <strong className="font-semibold tabular-nums">{site.pages.length}</strong> of <span className="tabular-nums">{crawl.pages.length}</span> pages, and rebuilt them as <span className="tabular-nums">{blocks}</span> structured content blocks.
              It recorded <strong className="font-semibold tabular-nums">{a11y.length}</strong> accessibility findings on <span className="tabular-nums">{a11yPages}</span> pages, corrected in the rebuild, and <strong className="font-semibold tabular-nums">{notes.length}</strong> items on <span className="tabular-nums">{notePages}</span> pages that need a person to confirm before any of this is published.
            </p>
            <dl className="mt-6 grid grid-cols-2 md:grid-cols-3 border-t border-l border-kapwa-brand-900 print:grid-cols-3 print:break-inside-avoid">
              {figures.map(([v, l]) => <div key={l} className="border-r border-b border-kapwa-brand-900 p-4 print:p-2.5"><dd className="text-3xl font-display font-normal tracking-tight tabular-nums text-neutral-900 print:text-[18pt]">{v}</dd><dt className="mt-1 text-[13px] text-neutral-600 print:text-[8pt]">{l}</dt></div>)}
            </dl>
            {site.site_notes.length > 0 && (
              <ol className="mt-6 grid gap-x-10 xl:grid-cols-2">
                {site.site_notes.map((t, i) => <li key={i} className="grid grid-cols-[2.5rem_1fr] gap-x-3 border-b border-neutral-200 py-2.5 text-[15px] leading-snug print:break-inside-avoid print:py-1.5 print:text-[9pt]"><span className="font-semibold tabular-nums text-neutral-400">S-{String(i + 1).padStart(2, "0")}</span><span className="text-neutral-800">{t}</span></li>)}
              </ol>
            )}
          </Sec>

          <Sec n={n++} title="Source analysis" aside="What SAM 3.1 saw on the old homepage">
            <div className="grid gap-8 xl:grid-cols-[1fr_260px] print:grid-cols-[1fr_38mm] print:gap-5">
              <div className="print:break-inside-avoid">
                <p className="text-neutral-600 print:text-[9pt]">Noun-phrase prompts (logo, navigation menu, banner, sidebar, footer) on the original screenshot. The seal was cut out and reused as the new site&rsquo;s brand mark.</p>
                <div className="mt-4 relative overflow-hidden border border-kapwa-brand-900 bg-white" style={{ aspectRatio: `${vw}/${vh}` }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/jobs/${jobId}/${home.viewportShotFile}`} alt="Original homepage" className="absolute inset-0 w-full h-full" />
                  {segments.map((b, i) => (
                    <div key={i} className="absolute border-2" style={{ left: `${(b.left / vw) * 100}%`, top: `${(b.top / vh) * 100}%`, width: `${((b.right - b.left) / vw) * 100}%`, height: `${((b.bottom - b.top) / vh) * 100}%`, borderColor: COLORS[b.prompt] ?? "#fff" }}>
                      <span className="absolute -top-5 left-0 text-[10px] font-bold px-1 tabular-nums" style={{ background: COLORS[b.prompt] ?? "#fff", color: "#111" }}>{b.prompt} {(b.confidence * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
                {segments.length > 0 && (
                  <table className="mt-4 w-full text-sm print:text-[8.5pt]">
                    <thead><tr className="border-b-2 border-kapwa-brand-900 text-left"><th className="py-2 pr-4 font-semibold">Region</th><th className="py-2 px-4 font-semibold text-right tabular-nums">Confidence</th><th className="py-2 pl-4 font-semibold text-right tabular-nums">Box (px)</th></tr></thead>
                    <tbody>{segments.map((b, i) => <tr key={i} className="border-b border-neutral-200"><td className="py-1.5 pr-4 flex items-center gap-2"><span className="size-3 border border-kapwa-brand-900" style={{ background: COLORS[b.prompt] ?? "#fff" }} />{b.prompt}</td><td className="py-1.5 px-4 text-right tabular-nums">{(b.confidence * 100).toFixed(0)}%</td><td className="py-1.5 pl-4 text-right tabular-nums text-neutral-500">{Math.round(b.right - b.left)} × {Math.round(b.bottom - b.top)}</td></tr>)}</tbody>
                  </table>
                )}
              </div>
              <div className="print:break-inside-avoid">
                <div className={`${eyebrow} text-neutral-500`}>Extracted brand mark</div>
                <div className="mt-3 grid grid-cols-2 border-t border-l border-kapwa-brand-900">
                  <div className="border-r border-b border-kapwa-brand-900 bg-white p-4 aspect-square grid place-items-center print:p-2">{logo ? <Seal src={logo} alt="Seal on white" /> : <span className="text-xs text-neutral-400">none</span>}</div>
                  <div className="border-r border-b border-kapwa-brand-900 bg-kapwa-brand-950 p-4 aspect-square grid place-items-center print:p-2 print:[print-color-adjust:exact]">{logo ? <Seal src={logo} alt="Seal on navy" /> : null}</div>
                </div>
                <p className="mt-3 text-[13px] text-neutral-500 print:text-[8pt]">Cut from the SAM 3.1 logo mask. Used in the header, footer and social previews of the rebuilt site.</p>
              </div>
            </div>
          </Sec>

          <Sec n={n++} title="Page inventory" aside={<span className="tabular-nums">{site.pages.length} pages · blocks / a11y / human</span>}>
            <ol className="grid 2xl:grid-cols-2 gap-x-12">
              {site.pages.map((p, i) => (
                <li key={p.slug} className="grid grid-cols-[2.5rem_1fr_auto] items-baseline gap-x-3 border-b border-neutral-200 py-2.5 print:break-inside-avoid print:py-1.5 print:text-[9pt]">
                  <span className="font-semibold tabular-nums text-neutral-400 text-sm">{nn(i)}</span>
                  <span className="min-w-0">
                    <Link href={pageHref(p.slug)} className="font-semibold text-neutral-900 hover:text-kapwa-brand-900 leading-snug">{p.title}</Link>
                    <span className="block truncate text-xs text-neutral-500"><span className="uppercase tracking-wider font-semibold text-[10px] text-kapwa-brand-900">{p.page_type}</span> · <a href={p.source_url} target="_blank" rel="noreferrer" className="hover:underline">{new URL(p.source_url).pathname || "/"}</a></span>
                  </span>
                  <span className="text-sm tabular-nums text-neutral-700 whitespace-nowrap"><span>{p.blocks.length}</span><span className="text-neutral-300 mx-1.5">/</span><span className={p.a11y_issues.length ? "text-kapwa-red-700" : ""}>{p.a11y_issues.length}</span><span className="text-neutral-300 mx-1.5">/</span><span className={p.migration_notes.length ? "text-kapwa-orange-700" : ""}>{p.migration_notes.length}</span></span>
                </li>
              ))}
            </ol>
          </Sec>

          <Register n={n++} title="Accessibility findings" tone="red" items={a11y} cats={A11Y_CATEGORIES} jobId={jobId}
            deck="Issues Muse Spark observed on the original pages. The rebuilt site addresses them with semantic headings, real text instead of images of text, labelled controls and WCAG AA contrast." />
          <Register n={n++} title="Items for human review" tone="amber" items={notes} cats={HUMAN_CATEGORIES} jobId={jobId}
            deck="Content the agent migrated but could not verify, and gaps it could not fill. Each item should be checked by the agency before anything here is treated as current." />

          {crawl.skipped.length > 0 && (
            <Sec n={n++} title="Excluded during crawl" aside={<span className="tabular-nums">{crawl.skipped.length} addresses</span>}>
              <ol className="grid gap-x-10 2xl:grid-cols-2">{crawl.skipped.map((s, i) => <li key={i} className="grid grid-cols-[2.5rem_1fr] gap-x-3 border-b border-neutral-200 py-2 text-sm print:break-inside-avoid print:py-1 print:text-[8.5pt]"><span className="font-semibold tabular-nums text-neutral-400">X-{String(i + 1).padStart(2, "0")}</span><span className="min-w-0"><span className="block truncate text-neutral-800">{s.url}</span><span className="text-xs text-neutral-500">{s.reason}</span></span></li>)}</ol>
            </Sec>
          )}

          <p className="mt-14 border-t border-neutral-300 pt-4 text-[13px] text-neutral-500 lg:pl-[calc(12rem+3rem)] print:mt-8 print:pl-[calc(34mm+1.5rem)] print:text-[8pt]">Prepared automatically by RE:GOV. The rebuilt site is an unofficial, AI-generated concept and is not affiliated with or endorsed by {site.agency.short_name}. Findings are machine observations and may be incomplete; verify against the official website before acting on them.</p>
            </td></tr>
          </tbody>
        </table>
      </main>
      <div className="print:hidden"><AppFooter /></div>
    </>
  );
}
