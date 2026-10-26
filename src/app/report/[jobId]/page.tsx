import Link from "next/link";
import { notFound } from "next/navigation";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { JOBS_ROOT, loadSite } from "@/lib/jobs";
import type { CrawlResult } from "@/pipeline/types";
import type { Box } from "@/pipeline/segment";

export const dynamic = "force-dynamic";

type Finding = { page: string; slug: string; text: string };
function groupBy(items: Finding[]) {
  const m = new Map<string, { page: string; slug: string; items: string[] }>();
  for (const it of items) (m.get(it.slug) ?? m.set(it.slug, { page: it.page, slug: it.slug, items: [] }).get(it.slug)!).items.push(it.text);
  return [...m.values()];
}

function Findings({ title, subtitle, tone, groups, jobId }: { title: string; subtitle: string; tone: "red" | "amber"; groups: { page: string; slug: string; items: string[] }[]; jobId: string }) {
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  const dot = tone === "red" ? "bg-kapwa-red-500" : "bg-kapwa-yellow-400";
  const badge = tone === "red" ? "bg-kapwa-red-50 text-kapwa-red-700" : "bg-kapwa-yellow-50 text-kapwa-orange-700";
  return (
    <div>
      <div className="flex items-baseline gap-3"><h2 className="text-2xl font-bold tracking-tight">{title}</h2><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge}`}>{total}</span></div>
      <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
      <div className="mt-5 overflow-hidden rounded-2xl bg-white ring-1 ring-neutral-200 divide-y divide-neutral-100">
        {groups.map((g) => (
          <details key={g.slug} open={g.items.length <= 4} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-3.5 hover:bg-neutral-50">
              <span className="flex items-center gap-3 min-w-0"><span className={`size-2 shrink-0 rounded-full ${dot}`} /><Link href={g.slug === "home" ? `/preview/${jobId}` : `/preview/${jobId}/${g.slug}`} className="truncate font-semibold text-neutral-900 hover:text-kapwa-brand-900">{g.page}</Link></span>
              <span className="flex items-center gap-3 text-xs text-neutral-500"><span>{g.items.length}</span><span className="text-neutral-400 transition group-open:rotate-180">▾</span></span>
            </summary>
            <ul className="px-5 pb-4 pl-10 space-y-2 text-[15px] leading-relaxed text-neutral-700">
              {g.items.map((t, i) => <li key={i} className="relative before:absolute before:-left-4 before:top-[0.7em] before:size-1 before:rounded-full before:bg-neutral-300">{t}</li>)}
            </ul>
          </details>
        ))}
        {groups.length === 0 && <p className="px-5 py-6 text-sm text-neutral-500">Nothing found.</p>}
      </div>
    </div>
  );
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
  const a11y = site.pages.flatMap((p) => p.a11y_issues.map((i) => ({ page: p.title, slug: p.slug, issue: i })));
  const notes = site.pages.flatMap((p) => p.migration_notes.map((n) => ({ page: p.title, slug: p.slug, note: n })));
  const blocks = site.pages.reduce((n, p) => n + p.blocks.length, 0);
  const imageOnly = site.pages.reduce((n, p) => n + p.blocks.filter((b) => b.type === "image").length, 0);
  const Stat = ({ v, l }: { v: string | number; l: string }) => <div className="rounded-xl ring-1 ring-neutral-200 p-4"><div className="text-3xl font-extrabold tracking-tight">{v}</div><div className="text-sm text-neutral-500">{l}</div></div>;

  return (
    <main className="container-gov py-14 flex-1">
      <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-900">← All jobs</Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-semibold uppercase tracking-wider text-kapwa-brand-700">RE:GOV migration report</p><h1 className="text-4xl font-extrabold tracking-tight">{site.agency.name}</h1><p className="text-neutral-500">{site.origin} → BetterGov Kapwa standard · {new Date(site.generated_at).toLocaleString()}</p></div>
        <div className="flex gap-3"><Link href={`/preview/${jobId}`} className="rounded-md bg-kapwa-brand-800 px-4 py-2 font-semibold text-white">Open new site</Link><a href={site.origin} target="_blank" rel="noreferrer" className="rounded-md ring-1 ring-neutral-300 px-4 py-2 font-semibold">Original ↗</a></div>
      </div>

      <div className="mt-10 grid grid-cols-2 md:grid-cols-6 gap-4">
        <Stat v={crawl.pages.length} l="pages crawled" /><Stat v={site.pages.length} l="pages rebuilt" /><Stat v={blocks} l="content blocks" /><Stat v={a11y.length} l="accessibility issues found" /><Stat v={imageOnly} l="image-only sections transcribed" /><Stat v={((site.tokens ?? 0) / 1000).toFixed(0) + "k"} l="Muse Spark tokens" />
      </div>

      <section className="mt-14 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">What SAM 3.1 saw on the old homepage</h2>
          <p className="mt-1 text-neutral-600">Noun-phrase prompts (logo, search box, map, infographic, photograph) on the original screenshot. The seal was cut out and reused as the new site's brand mark.</p>
          <div className="mt-4 relative rounded-xl overflow-hidden ring-1 ring-neutral-200" style={{ aspectRatio: `${vw}/${vh}` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/jobs/${jobId}/${home.viewportShotFile}`} alt="Original homepage" className="absolute inset-0 w-full h-full" />
            {segments.map((b, i) => (
              <div key={i} className="absolute border-2 rounded-sm" style={{ left: `${(b.left / vw) * 100}%`, top: `${(b.top / vh) * 100}%`, width: `${((b.right - b.left) / vw) * 100}%`, height: `${((b.bottom - b.top) / vh) * 100}%`, borderColor: COLORS[b.prompt] ?? "#fff", boxShadow: `0 0 0 9999px ${(COLORS[b.prompt] ?? "#fff")}00` }}>
                <span className="absolute -top-5 left-0 text-[10px] font-bold px-1 rounded" style={{ background: COLORS[b.prompt] ?? "#fff", color: "#111" }}>{b.prompt} {(b.confidence * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl ring-1 ring-neutral-200 p-5">
            <h3 className="font-semibold">Extracted brand mark</h3>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-white ring-1 ring-neutral-200 p-3 grid place-items-center">{site.assets.logo ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={`/api/jobs/${jobId}/${site.assets.logo}?v=${encodeURIComponent(site.generated_at)}`} alt="logo on white" className="max-h-20" /> : <span className="text-xs text-neutral-400">none</span>}</div>
              <div className="rounded-lg bg-kapwa-brand-950 p-3 grid place-items-center">{site.assets.logo ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={`/api/jobs/${jobId}/${site.assets.logo}?v=${encodeURIComponent(site.generated_at)}`} alt="logo on brand" className="max-h-20" /> : null}</div>
            </div>
          </div>
          <div className="rounded-xl ring-1 ring-neutral-200 p-5">
            <h3 className="font-semibold">Site-wide findings</h3>
            <ul className="mt-2 list-disc pl-5 text-sm text-neutral-700 space-y-1.5">{site.site_notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
          </div>
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-bold tracking-tight">Page by page</h2>
        <div className="mt-4 overflow-x-auto rounded-xl ring-1 ring-neutral-200">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wider text-neutral-500"><tr><th className="px-4 py-3">Old page</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Blocks</th><th className="px-4 py-3">A11y issues</th><th className="px-4 py-3">Needs a human</th><th className="px-4 py-3">New page</th></tr></thead>
            <tbody className="divide-y divide-neutral-100">
              {site.pages.map((p) => (
                <tr key={p.slug}>
                  <td className="px-4 py-3"><a className="text-kapwa-brand-800 hover:underline" href={p.source_url} target="_blank" rel="noreferrer">{new URL(p.source_url).pathname || "/"}</a></td>
                  <td className="px-4 py-3"><span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium">{p.page_type}</span></td>
                  <td className="px-4 py-3">{p.blocks.length}</td>
                  <td className="px-4 py-3">{p.a11y_issues.length}</td>
                  <td className="px-4 py-3">{p.migration_notes.length}</td>
                  <td className="px-4 py-3"><Link className="font-medium text-kapwa-brand-800 hover:underline" href={p.slug === "home" ? `/preview/${jobId}` : `/preview/${jobId}/${p.slug}`}>{p.title}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-14 grid gap-10 lg:grid-cols-2">
        <Findings
          title="Accessibility issues fixed"
          subtitle="Found by Muse Spark on the old pages. The new site uses semantic headings, real text, labelled controls and WCAG AA contrast."
          tone="red"
          groups={groupBy(a11y.map((x) => ({ page: x.page, slug: x.slug, text: x.issue })))}
          jobId={jobId}
        />
        <Findings
          title="Needs a human"
          subtitle="Content the agent migrated but could not verify, and gaps it could not fill."
          tone="amber"
          groups={groupBy(notes.map((x) => ({ page: x.page, slug: x.slug, text: x.note })))}
          jobId={jobId}
        />
      </section>

      {crawl.skipped.length > 0 && <section className="mt-14"><h2 className="text-xl font-bold">Skipped during crawl</h2><ul className="mt-2 text-sm text-neutral-600 space-y-1">{crawl.skipped.map((s, i) => <li key={i}>{s.url} — {s.reason}</li>)}</ul></section>}
    </main>
  );
}
