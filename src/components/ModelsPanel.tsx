/** What each Meta model did for one site, and how their outputs fed each other, read from the run's files. */
import Link from "next/link";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { JOBS_ROOT } from "@/lib/jobs";
import { isServicePage } from "@/lib/charterPages";
import { eyebrow } from "@/components/AppShell";
import type { SiteModel } from "@/pipeline/schema";
import type { CrawlResult } from "@/pipeline/types";
import type { Box } from "@/pipeline/segment";
import type { RegionsFile } from "@/pipeline/imageText";
import type { PortraitFile } from "@/pipeline/portraits";
import type { EvidenceFile } from "@/pipeline/evidence";
import type { VerifyFile } from "@/pipeline/verify";
import type { CharterFile } from "@/pipeline/charter";

async function json<T>(jobId: string, file: string): Promise<T | null> {
  try { return JSON.parse(await readFile(join(JOBS_ROOT, jobId, file), "utf8")) as T; } catch { return null; }
}

export async function ModelsPanel({ jobId, site }: { jobId: string; site: SiteModel }) {
  const [crawl, segments, regions, portraits, evidence, verify, charter] = await Promise.all([
    json<CrawlResult>(jobId, "crawl.json"), json<Box[]>(jobId, "assets/segments.json"), json<RegionsFile>(jobId, "assets/regions.json"),
    json<PortraitFile>(jobId, "assets/portraits.json"), json<EvidenceFile>(jobId, "assets/evidence.json"), json<VerifyFile>(jobId, "assets/verify.json"), json<CharterFile>(jobId, "assets/charter.json"),
  ]);
  const v = encodeURIComponent(site.generated_at);
  const src = (f: string) => `/api/jobs/${jobId}/${f}?v=${v}`;
  const read = regions?.regions.filter((r) => r.read?.text_found) ?? [];
  // Service pages are added from the charter PDFs when the site loads; count the pages Muse Spark read.
  const pages = site.pages.filter((p) => !isServicePage(p));
  const blocks = pages.reduce((n, p) => n + p.blocks.length, 0);
  const a11y = pages.reduce((n, p) => n + p.a11y_issues.length, 0);
  const services = charter?.docs.reduce((n, d) => n + d.services.length, 0) ?? 0;
  const art = (site.design as { art?: { image?: string } } | undefined)?.art?.image;
  const images = [site.design?.mode === "refine" ? "" : site.assets.band, site.assets.cover, art].filter((f): f is string => !!f);
  const q = crawl?.quality, c = crawl?.coverage;

  const sam: React.ReactNode[] = [
    segments && <>Mapped <b>{segments.length}</b> regions on the old homepage{site.assets.logo ? " and cut out the seal for the new logo" : ""}.</>,
    regions && regions.regions.length > 0 && <>Located <b>{regions.regions.length}</b> {regions.regions.length === 1 ? "image" : "images"} with text that Muse Spark spotted, and cut {regions.regions.length === 1 ? "it" : "them"} out at full resolution.</>,
    portraits && portraits.checked > 0 && <>Found <b>{portraits.checked}</b> portrait {portraits.checked === 1 ? "photo" : "photos"} of officials.</>,
    evidence && evidence.items.length > 0 && <>Outlined <b>{evidence.items.length}</b> accessibility {evidence.items.length === 1 ? "problem" : "problems"} Muse Spark picked on the old homepage.</>,
  ].filter(Boolean);
  const spark: React.ReactNode[] = [
    <>Read <b>{pages.length}</b> pages, screenshot and text together, into <b>{blocks}</b> content blocks and <b>{a11y}</b> accessibility findings.</>,
    regions && regions.regions.some((r) => r.read) && <>Read SAM&rsquo;s crops: {read.length ? <><b>{read.length}</b> held facts the page text did not, now in the rebuilt homepage.</> : "the page text already said everything in them."}</>,
    <>Planned the site: {site.nav.length} menu sections for {site.agency.short_name || site.agency.name}.</>,
    portraits && portraits.people.length > 0 && <>Named <b>{portraits.people.length}</b> of SAM&rsquo;s portraits from their captions and wrote the missing alt text.</>,
    services > 0 && <>Turned <b>{charter!.docs.length}</b> Citizen&rsquo;s Charter {charter!.docs.length === 1 ? "PDF" : "PDFs"} into <b>{services}</b> service pages.</>,
    verify && verify.pages.length > 0 && <>Checked its own work: <b>{verify.average}%</b> of the original content kept on average across {verify.pages.length} pages.</>,
  ].filter(Boolean);

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b-2 border-kapwa-brand-900 pb-3">
        <h2 className="text-2xl font-display font-normal tracking-tight text-neutral-900">What each model did</h2>
        {q && c && <p className="text-sm text-neutral-600"><span className={`font-semibold ${q.status === "complete" ? "text-kapwa-green-800" : "text-kapwa-orange-800"}`}>{q.status === "complete" ? "Complete crawl" : "Partial crawl"}</span> · {c.crawled} of {c.discovered.toLocaleString("en-PH")} pages found{crawl?.archive ? ` · Wayback Machine copy of ${crawl.archive.date.slice(0, 4)}` : ""}</p>}
      </div>
      <div className="grid md:grid-cols-3 border-l border-neutral-200">
        <Col title="SAM 3.1" tag="Sees" tone="text-kapwa-orange-700" items={sam}>
          <div className="mt-4 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {site.assets.logo && <img src={src(site.assets.logo)} alt="Seal cut out by SAM 3.1" className="size-14 border border-neutral-200 bg-white object-contain p-1" />}
            {regions?.regions.slice(0, 3).map((r) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={r.n} src={src(r.file)} alt={r.label} className="h-14 w-20 border border-neutral-200 bg-neutral-100 object-cover" />
            ))}
          </div>
        </Col>
        <Col title="Muse Spark" tag="Reads and writes" tone="text-kapwa-brand-800" items={spark} />
        <Col title="Muse Image" tag="Paints" tone="text-kapwa-green-800" items={images.length ? [<>Painted {images.length === 1 ? "the artwork" : `${images.length} pieces of artwork`} from a brief Muse Spark wrote. Decoration only: no text, seals or logos.</>] : [<>No artwork for this site.</>]}>
          {images.length > 0 && <div className="mt-4 grid grid-cols-3 gap-2">{images.map((f) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={f} src={src(f)} alt="" className="aspect-[4/3] w-full border border-neutral-200 object-cover" />
          ))}</div>}
        </Col>
      </div>
      <p className="mt-3 text-sm text-neutral-600">Each step is shown, with screenshots, in the <Link href={`/report/${jobId}`} className="font-semibold text-kapwa-brand-900 hover:underline">migration report</Link>.</p>
    </section>
  );
}

function Col({ title, tag, tone, items, children }: { title: string; tag: string; tone: string; items: React.ReactNode[]; children?: React.ReactNode }) {
  return (
    <div className="border-r border-b border-neutral-200 p-5">
      <p className={`${eyebrow} ${tone}`}>{tag}</p>
      <h3 className="mt-1 text-xl font-bold text-neutral-900">{title}</h3>
      <ul className="mt-3 space-y-2 text-[15px] leading-snug text-neutral-700 [&_b]:font-semibold [&_b]:tabular-nums [&_b]:text-neutral-900">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
      {children}
    </div>
  );
}
