import Link from "next/link";
import { notFound } from "next/navigation";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { JOBS_ROOT, loadSite, type JobStatus } from "@/lib/jobs";
import type { CrawlResult } from "@/pipeline/types";
import { AppHeader, AppFooter, eyebrow, btn, nn } from "@/components/AppShell";
import { ScaledFrame } from "@/components/ScaledFrame";
import { STEPS } from "@/lib/progress";
import { loadScores, fmtMs, fmtBytes, change } from "@/lib/scores";
import { CHARTER_SLUG } from "@/lib/charterPages";
import type { CharterFile } from "@/pipeline/charter";
import type { PortraitFile } from "@/pipeline/portraits";
import type { VerifyFile } from "@/pipeline/verify";
import type { EvidenceFile } from "@/pipeline/evidence";

export const dynamic = "force-dynamic";
export const metadata = { title: "Case study: Paombong | RE:GOV", description: "One municipal website taken through RE:GOV end to end, with the measured results and what still needs a person." };

/** The run this page tells the story of. Every figure below is read from its files, so a rerun updates the page. */
const CASE = "paombong-gov-ph-mvq4eqm0";

async function json<T>(file: string): Promise<T | null> {
  try { return JSON.parse(await readFile(join(JOBS_ROOT, CASE, file), "utf8")) as T; } catch { return null; }
}

/** One numbered section: title on the left, story on the right, like the migration report. */
function Sec({ n, title, aside, children }: { n: number; title: string; aside?: string; children: React.ReactNode }) {
  return (
    <section className="mt-14 grid gap-x-12 gap-y-4 border-t border-neutral-300 pt-6 lg:grid-cols-[14rem_1fr]">
      <div>
        <div className="text-[11px] font-semibold tabular-nums text-neutral-500">{nn(n - 1)}</div>
        <h2 className="mt-1 text-2xl font-display font-normal tracking-tight text-neutral-900">{title}</h2>
        {aside && <p className="mt-2 text-[13px] text-neutral-500">{aside}</p>}
      </div>
      <div className="min-w-0 max-w-4xl text-[16px] leading-relaxed text-neutral-700 [&>p+p]:mt-3">{children}</div>
    </section>
  );
}

const Figures = ({ items }: { items: [string | number, string][] }) => (
  <dl className="grid grid-cols-2 lg:grid-cols-3 border-t border-l border-kapwa-brand-900">
    {items.map(([v, l]) => <div key={l} className="border-r border-b border-kapwa-brand-900 p-4 sm:p-5"><dd className="text-3xl sm:text-4xl font-display font-normal tracking-tight tabular-nums text-neutral-900">{v}</dd><dt className="mt-1 text-[13px] text-neutral-600">{l}</dt></div>)}
  </dl>
);

export default async function CaseStudy() {
  const site = await loadSite(CASE);
  const crawl = await json<CrawlResult>("crawl.json");
  if (!site || !crawl) notFound();
  const [scores, charter, portraits, verify, evidence, status] = await Promise.all([
    loadScores(join(JOBS_ROOT, CASE)), json<CharterFile>("assets/charter.json"), json<PortraitFile>("assets/portraits.json"),
    json<VerifyFile>("assets/verify.json"), json<EvidenceFile>("assets/evidence.json"), json<JobStatus>("status.json"),
  ]);
  const host = new URL(site.origin).host;
  const name = site.agency.short_name || site.agency.name;
  const preview = (slug = "") => `/preview/${CASE}${slug && slug !== "home" ? `/${slug}` : ""}?lang=en`;
  const crawled = site.pages.filter((p) => !p.document);
  const services = site.pages.filter((p) => p.document && p.slug !== CHARTER_SLUG);
  const serviceCount = charter?.docs.reduce((t, d) => t + d.services.length, 0) ?? services.length;
  const notes = crawled.reduce((t, p) => t + p.migration_notes.length, 0);
  const a11y = crawled.reduce((t, p) => t + p.a11y_issues.length, 0);
  const o = scores?.original, r = scores?.rebuilt;

  // How long each build step took, from the run's own event log.
  const ev = status?.events ?? [];
  const marks: { key: string; t: number }[] = [{ key: "crawl", t: status ? new Date(status.startedAt).getTime() : 0 }];
  for (const e of ev as { type: string; phase?: string; t: number }[]) if (e.type === "phase" && e.phase && e.phase !== "crawl") marks.push({ key: e.phase, t: e.t });
  const built = (ev as { type: string; t: number; ms?: number }[]).find((e) => e.type === "built");
  const timeline = built ? marks.map((m, i) => ({ ...m, ms: (marks[i + 1]?.t ?? built.t) - m.t, step: STEPS.find((s) => s.key === m.key) })).filter((m) => m.step && m.ms >= 1000) : [];
  const total = timeline.reduce((t, m) => t + m.ms, 0);
  const minutes = (ms: number) => ms < 60_000 ? `${Math.round(ms / 1000)} s` : `${Math.floor(ms / 60_000)} min ${Math.round((ms % 60_000) / 1000)} s`;

  const flagged = (verify?.pages ?? []).filter((p) => p.verdict !== "faithful" || p.unsupported.length).slice(0, 3);
  // Show titles as the offices wrote them, preferring the ones not set partly in capitals.
  const caps = (t: string) => (t.match(/\b[A-Z]{3,}\b/g) ?? []).length;
  const sample = [...services].sort((a, b) => caps(a.title) - caps(b.title)).slice(0, 6);

  const figures: [string | number, string][] = [
    [crawled.length, "pages migrated with their content"],
    [serviceCount, `services read from ${charter?.docs.length ?? "its"} Citizen's Charter PDFs`],
    [portraits?.people.length ?? 0, "officials' photos found and named"],
    ...(verify ? [[`${verify.average}%`, "of the original content kept, by self-check"] as [string, string]] : []),
    ...(o && r ? [[change(o.bytes, r.bytes, ["lighter", "heavier"]).text, `homepage weight: ${fmtBytes(o.bytes)} → ${fmtBytes(r.bytes)}`] as [string, string],
      [`${o.axe_elements} → ${r.axe_elements}`, "elements failing automated WCAG checks"] as [string, string]] : []),
  ];

  return (
    <>
      <AppHeader crumb="Case study" />
      <main className="flex-1">
        <div className="container-gov max-w-[1400px] pt-10 pb-20">
          <p className={`${eyebrow} text-kapwa-brand-900`}>Case study</p>
          <h1 className="mt-2 max-w-4xl text-4xl sm:text-6xl font-display font-normal tracking-tight leading-[1.02] text-neutral-900">{site.agency.name}: one website, end to end</h1>
          <p className="mt-5 max-w-3xl text-lg text-neutral-600">What RE:GOV did with <span className="font-semibold text-neutral-900">{host}</span>{total ? ` in about ${Math.round(total / 60_000)} minutes` : ""}, what it measured, and what still needs a person. Every number on this page is read from the run itself.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={preview()} className={btn.primary}>View the rebuilt site →</Link>
            <Link href={`/report/${CASE}`} className={btn.ghost}>Full migration report</Link>
          </div>

          <div className="mt-10"><Figures items={figures} /></div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <figure>
              <figcaption className={`${eyebrow} text-neutral-500 pb-2`}>Before · {host}</figcaption>
              {evidence ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/jobs/${CASE}/${evidence.shot}?v=${encodeURIComponent(evidence.generated_at)}`} alt={`The original ${name} homepage`} className="w-full border border-neutral-300 object-cover object-top" style={{ aspectRatio: "1440/900" }} />
              ) : <div className="border border-neutral-300 bg-neutral-50" style={{ aspectRatio: "1440/900" }} />}
            </figure>
            <figure>
              <figcaption className={`${eyebrow} text-neutral-500 pb-2`}>After · unofficial RE:GOV concept</figcaption>
              <ScaledFrame src={preview()} title={`Rebuilt ${name} homepage`} className="border border-kapwa-brand-900" />
            </figure>
          </div>

          <Sec n={1} title="The starting point" aside="What the agent found">
            <p>{name}&rsquo;s site is typical of many local government sites: it works, it has real information, and it is hard to use. The homepage {o ? `weighed ${fmtBytes(o.bytes)} across ${o.requests} requests` : "was heavy"}, key notices lived inside images, and much of what residents come for (permits, certificates, fees) sat in PDF files.</p>
            <p>Reading all {crawled.length} pages, Muse Spark logged <span className="font-semibold text-neutral-900">{a11y} accessibility problems</span>. These are the ones you could see on the homepage, outlined by SAM 3.1:</p>
            {evidence && (
              <ol className="mt-4 divide-y divide-neutral-200 border-y border-neutral-200">
                {evidence.items.map((x) => <li key={x.n} className="grid grid-cols-[1.75rem_1fr] gap-x-3 py-2.5"><span className="grid size-7 place-items-center bg-kapwa-red-600 text-sm font-bold text-white tabular-nums">{x.n}</span><span><span className="font-semibold text-neutral-900">{x.label}</span>{x.sc.length > 0 && <span className="text-[13px] text-neutral-500"> · WCAG {x.sc.join(", ")}</span>}</span></li>)}
              </ol>
            )}
          </Sec>

          {timeline.length > 0 && (
            <Sec n={2} title="How the agent worked" aside={`Build time ${minutes(total)}`}>
              <p>Nobody wrote a page by hand. The agent crawled the site with a real browser, then three Meta models did the reading, finding and drawing:</p>
              <table className="mt-4 w-full text-[15px]">
                <thead><tr className="border-b-2 border-kapwa-brand-900 text-left"><th className="py-2 pr-3 font-semibold">Step</th><th className="py-2 px-3 font-semibold">Done by</th><th className="py-2 pl-3 text-right font-semibold">Time</th></tr></thead>
                <tbody>{timeline.map((m) => <tr key={m.key} className="border-b border-neutral-200"><td className="py-2 pr-3 text-neutral-900">{m.step!.label}</td><td className="py-2 px-3">{m.step!.tool}</td><td className="py-2 pl-3 text-right tabular-nums">{minutes(m.ms)}</td></tr>)}</tbody>
              </table>
              <p className="mt-4">Then came the checks that now run on every site: reading the Citizen&rsquo;s Charter, finding officials&rsquo; photos, the self-check, the outlined evidence and the WCAG 2.2 audit. <Link href="/how-it-works" className="font-semibold text-kapwa-brand-900 hover:underline">How each step works →</Link></p>
            </Sec>
          )}

          {o && r && (
            <Sec n={3} title="Before and after" aside="Homepage, measured the same way">
              <table className="w-full text-[15px]">
                <thead><tr className="border-b-2 border-kapwa-brand-900 text-left"><th className="py-2 pr-3 font-semibold">Measure</th><th className="py-2 px-3 text-right font-semibold">Original</th><th className="py-2 px-3 text-right font-semibold">Rebuild</th></tr></thead>
                <tbody>
                  {([["Largest content visible", o.lcp_ms != null ? fmtMs(o.lcp_ms) : "–", r.lcp_ms != null ? fmtMs(r.lcp_ms) : "–"], ["Fully loaded", fmtMs(o.load_ms), fmtMs(r.load_ms)], ["Page weight", fmtBytes(o.bytes), fmtBytes(r.bytes)], ["Requests", o.requests, r.requests], ["Elements failing WCAG checks", o.axe_elements, r.axe_elements]] as [string, string | number, string | number][]).map(([l, a, b]) => (
                    <tr key={l} className="border-b border-neutral-200"><td className="py-2 pr-3">{l}</td><td className="py-2 px-3 text-right tabular-nums">{a}</td><td className="py-2 px-3 text-right tabular-nums font-semibold text-neutral-900">{b}</td></tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-4 text-[14px] text-neutral-600">Fresh browser, no cache, 1280 × 900, from the RE:GOV server. A phone on mobile data will be slower for both, but the gap in weight holds.</p>
            </Sec>
          )}

          {charter && (
            <Sec n={4} title="Services out of the PDFs" aside="Muse Spark read the Citizen's Charter">
              <p>Every office in the Philippines must publish a Citizen&rsquo;s Charter: what each service needs, the steps, the fees and how long it takes. {name} published {charter.docs.length} of them as PDF files. Muse Spark read each PDF directly and turned it into {serviceCount} service pages, each with a requirements list and a step table, linked back to the source PDF.</p>
              {sample.length > 0 && (
                <ul className="mt-4 grid sm:grid-cols-2 border-t border-l border-neutral-200">
                  {sample.map((p) => <li key={p.slug} className="border-r border-b border-neutral-200"><Link href={preview(p.slug)} className="block p-3 text-[15px] font-semibold text-neutral-900 hover:bg-kapwa-brand-50 hover:text-kapwa-brand-900">{p.title}</Link></li>)}
                </ul>
              )}
              <p className="mt-3"><Link href={preview(CHARTER_SLUG)} className="font-semibold text-kapwa-brand-900 hover:underline">All {serviceCount} services →</Link></p>
            </Sec>
          )}

          {portraits && portraits.people.length > 0 && (
            <Sec n={5} title="Faces with names" aside="SAM 3.1 found them; captions named them">
              <p>SAM 3.1 found each portrait on the old pages. Muse Spark then matched every photo to a name from the caption beside it, never from the face, and wrote its alt text. Each crop on the rebuild is the original photo, not a generated one.</p>
              <ul className="mt-5 grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-6 gap-4">
                {portraits.people.slice(0, 12).map((p) => (
                  <li key={p.file}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/jobs/${CASE}/${p.file}`} alt={p.alt} className="aspect-square w-full object-cover bg-neutral-100" loading="lazy" />
                    <p className="mt-1.5 text-[13px] leading-snug text-neutral-800">{p.name}</p>
                  </li>
                ))}
              </ul>
            </Sec>
          )}

          {verify && (
            <Sec n={6} title="It checked its own work" aside="Muse Spark compared each page with its original">
              <p>After building, Muse Spark read each rebuilt page next to the original and listed what was lost or added. On average {verify.average}% of the original content made it across. The self-check also caught real mistakes, which go to a person first:</p>
              {flagged.length > 0 && (
                <ul className="mt-4 divide-y divide-neutral-200 border-y border-neutral-200">
                  {flagged.map((p) => <li key={p.slug} className="py-3"><Link href={preview(p.slug)} className="font-semibold text-neutral-900 hover:text-kapwa-brand-900">{p.title}</Link><span className="text-[13px] tabular-nums text-neutral-500"> · {p.coverage}% kept</span><p className="mt-1 text-[15px] text-neutral-700">{p.unsupported[0] ? <><span className="font-semibold text-kapwa-red-700">Not on the original:</span> {p.unsupported[0]}</> : p.missing[0] ? <><span className="font-semibold text-kapwa-orange-800">Lost:</span> {p.missing[0]}</> : null}</p></li>)}
                </ul>
              )}
            </Sec>
          )}

          <Sec n={7} title="What still needs a person" aside="Where the agent stops">
            <ul className="list-disc space-y-1.5 pl-5">
              <li><span className="font-semibold text-neutral-900">{notes} notes</span> in the report flag content to confirm: blank pages, archive dates, uncertain readings.</li>
              <li>Fees, hotlines and office hours should be checked against the office before anyone relies on them.</li>
              <li>Automated tests catch about a third of WCAG problems. Keyboard use and screen readers need a human tester.</li>
              <li>This is a concept. Only the municipality can publish it, and RE:GOV hands over a <a href={`/api/jobs/${CASE}/export`} className="font-semibold text-kapwa-brand-900 hover:underline">static copy with a redirect map</a> so its own team can.</li>
            </ul>
          </Sec>

          <section className="mt-16 border-t-2 border-kapwa-brand-900 bg-kapwa-brand-50 p-6 sm:p-8">
            <h2 className="text-3xl font-display font-normal tracking-tight text-neutral-900">Try it on another site</h2>
            <p className="mt-2 max-w-2xl text-neutral-700">Any .gov.ph or .edu.ph address works. A run takes a few minutes, and you can read <Link href="/how-it-works" className="font-semibold text-kapwa-brand-900 hover:underline">how it works</Link> or browse the <Link href="/showcase" className="font-semibold text-kapwa-brand-900 hover:underline">showcase</Link> while you wait.</p>
            <Link href="/#reimagine" className={`${btn.primary} mt-5`}>Reimagine a site →</Link>
          </section>

          <p className="mt-8 max-w-3xl text-[13px] text-neutral-500">RE:GOV is an independent project. The rebuilt {name} site is an unofficial, AI-generated concept, not affiliated with or endorsed by the {site.agency.name}. Content comes from the public site and may be incomplete or out of date.</p>
        </div>
      </main>
      <AppFooter />
    </>
  );
}
