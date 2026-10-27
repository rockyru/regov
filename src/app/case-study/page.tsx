import Link from "next/link";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { JOBS_ROOT, loadSite } from "@/lib/jobs";
import { kapwaStudy, type Example } from "@/lib/kapwaStudy";
import { AppHeader, AppFooter, eyebrow, btn, nn } from "@/components/AppShell";
import { ScaledFrame } from "@/components/ScaledFrame";
import { Block } from "@/components/site/Blocks";
import type { CrawlResult } from "@/pipeline/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Case study: Kapwa in an AI agent | RE:GOV", description: "How RE:GOV applies BetterGov.ph's Kapwa design system to every site it rebuilds: what fit, what didn't, and the components Philippine government sites need next." };

const KAPWA = "https://github.com/bettergovph/kapwa";
/** A modern site the design check chose to upgrade rather than replace. */
const REFINED = "e-gov-ph-mvq8z9ew";

const TYPE_LABEL: Record<string, string> = { richtext: "Text", links: "Link lists and directories", list: "Lists", cards: "Cards", image: "Image-only content (transcribed)", contact: "Office contacts", table: "Tables", people: "Officials and staff", callout: "Notices", steps: "Step-by-step processes", timeline: "Timelines and histories", faq: "FAQs" };
const MATCH: Record<string, ["fits" | "partial" | "missing", string]> = {
  richtext: ["partial", "ArticleContent (headings and paragraphs only)"], links: ["missing", "—"], list: ["partial", "List (fixed item shape)"], cards: ["fits", "Card"],
  image: ["missing", "—"], contact: ["missing", "—"], table: ["partial", "Table (fixed columns)"], people: ["partial", "OfficialBiography (one person, many required fields)"],
  callout: ["fits", "Banner"], steps: ["missing", "—"], timeline: ["missing", "—"], faq: ["missing", "—"],
};
const FIT: [string, "fits" | "partial" | "missing", string][] = [
  ["Card", "fits", "Takes any children. A good base for the cards block, which appears on most sites."],
  ["Banner", "partial", "Right for notices. Its call to action needs an onClick function, which a server-rendered or static page cannot pass, so only the text form works."],
  ["Button", "partial", "Renders a <button> only. Most actions on a government site are links to another page or a PDF, and there is no href or link variant."],
  ["ArticleCard, ArticleContent", "partial", "News cards fit. Article content takes headings and paragraphs only, so lists, tables and links inside a page have nowhere to go."],
  ["Input, Label", "fits", "Fine for the search box. RE:GOV's search form does not use them yet."],
  ["Table", "missing", "Its rows are fixed to id, name, email and status (Active, Pending, Inactive). A fee schedule or a list of barangays cannot be passed in."],
  ["List", "missing", "Items are fixed to id, title and category, so a list of permits with requirements does not fit."],
  ["OfficialBiography", "missing", "Requires serving-since, education, achievements, contact and a banner image. The agent usually knows a name, a position and a photo. Filling the rest would mean making it up."],
  ["StripBanner, CivicTechBanner", "missing", "Campaign banners with fixed copy slots. Useful for BetterGov's own pages, not for migrated content."],
];
const chip = { fits: "bg-kapwa-green-50 text-kapwa-green-800", partial: "bg-kapwa-yellow-50 text-kapwa-orange-800", missing: "bg-kapwa-red-50 text-kapwa-red-700" };
const chipLabel = { fits: "Fits", partial: "Partly", missing: "Doesn't fit" };

/** The components this page proposes, each with the props an agent can actually fill. */
const PROPOSALS: { key: string; name: string; why: string; props: string }[] = [
  { key: "contact", name: "OfficeContact", why: "Every office page ends with one. Values become tel:, mailto: and web links on their own, so the agent only says what each row is.", props: `heading: string
rows: {
  label?: string
  value: string
  more?: string[]
}[]` },
  { key: "steps", name: "StepList", why: "How to get a permit, enrol or file a claim. Numbered, readable on a phone, no JavaScript.", props: `heading: string
steps: {
  title: string
  detail?: string
  note?: string
}[]` },
  { key: "people", name: "OfficialsDirectory", why: "Councils, boards and heads of office as a grid. Photo optional with initials as the fallback, so nothing has to be invented.", props: `heading: string
people: {
  name: string
  position?: string
  term?: string
  photo?: { src: string; alt: string }
  href?: string
}[]` },
  { key: "links", name: "LinkDirectory", why: "Downloads, issuances and partner sites. Groups itself by category and marks PDF and Word files so people know what they are opening.", props: `heading: string
links: {
  title: string
  href: string
  group?: string
  description?: string
}[]` },
  { key: "timeline", name: "Timeline", why: "Histories, past officials and project milestones, with the date first.", props: `heading: string
events: {
  date: string
  title: string
  detail?: string
}[]` },
  { key: "faq", name: "Faq", why: "Built on <details>, so it opens and closes without JavaScript and survives a static export.", props: `heading: string
questions: {
  question: string
  answer: string
}[]` },
];

function Sec({ n, title, aside, children }: { n: number; title: string; aside?: string; children: React.ReactNode }) {
  return (
    <section className="mt-14 grid gap-x-12 gap-y-4 border-t border-neutral-300 pt-6 lg:grid-cols-[14rem_1fr]">
      <div>
        <div className="text-[11px] font-semibold tabular-nums text-neutral-500">{nn(n - 1)}</div>
        <h2 className="mt-1 text-2xl font-display font-normal tracking-tight text-neutral-900">{title}</h2>
        {aside && <p className="mt-2 text-[13px] text-neutral-500">{aside}</p>}
      </div>
      <div className="min-w-0 text-[16px] leading-relaxed text-neutral-700 [&>p]:max-w-3xl [&>p+p]:mt-3">{children}</div>
    </section>
  );
}

async function readCrawl(jobId: string) {
  try { return JSON.parse(await readFile(join(JOBS_ROOT, jobId, "crawl.json"), "utf8")) as CrawlResult; } catch { return null; }
}

export default async function KapwaCaseStudy() {
  const study = await kapwaStudy();
  const refined = await loadSite(REFINED);
  const refinedShot = refined?.design?.mode === "refine" ? (await readCrawl(REFINED))?.pages[0]?.viewportShotFile : undefined;
  const people = study.examples.people ? await loadSite(study.examples.people.jobId) : null;
  const pct = (n: number) => `${Math.round((n / study.blocks) * 100)}%`;
  const covered = study.types.filter((t) => MATCH[t.type]?.[0] === "fits").reduce((a, t) => a + t.blocks, 0);
  const missing = study.types.filter((t) => MATCH[t.type]?.[0] === "missing").reduce((a, t) => a + t.blocks, 0);
  const href = (jobId: string, slug = "") => `/preview/${jobId}${slug && slug !== "home" ? `/${slug}` : ""}?lang=en`;
  let n = 1;

  const figures: [string, string][] = [
    [study.sites.toLocaleString("en-PH"), "government sites rebuilt on Kapwa"],
    [study.blocks.toLocaleString("en-PH"), `content blocks across ${study.pages.toLocaleString("en-PH")} pages`],
    [pct(covered), "of those blocks have a Kapwa component that fits today"],
    [pct(missing), "have no Kapwa component at all"],
  ];

  const Example = ({ ex }: { ex: Example }) => (
    <figure className="min-w-0">
      <div className="border border-neutral-300 bg-white p-5 sm:p-7"><div data-blocks><Block block={ex.block} jobId={ex.jobId} origin={ex.origin} lang="en" portraits={ex.block.type === "people" ? people?.portraits : undefined} /></div></div>
      <figcaption className="mt-2 text-[13px] text-neutral-500">Rendered live from <Link href={href(ex.jobId, ex.slug)} className="font-semibold text-neutral-700 hover:text-kapwa-brand-900">{ex.site} · {ex.page}</Link>, content as the agent extracted it.</figcaption>
    </figure>
  );

  return (
    <>
      <AppHeader crumb="Case study" />
      <main className="flex-1">
        <div className="container-gov max-w-[1400px] pt-10 pb-20">
          <p className={`${eyebrow} text-kapwa-brand-900`}>Case study</p>
          <h1 className="mt-2 max-w-4xl text-4xl sm:text-6xl font-display font-normal tracking-tight leading-[1.02] text-neutral-900">Kapwa in an AI agent</h1>
          <p className="mt-5 max-w-3xl text-lg text-neutral-600">RE:GOV applies <a href={KAPWA} className="font-semibold text-kapwa-brand-900 hover:underline">Kapwa</a>, BetterGov.ph&rsquo;s design system, to every government site it rebuilds. This is what fit, what didn&rsquo;t, and the components Philippine government sites need that Kapwa does not have yet, drawn in RE:GOV&rsquo;s style as a proposal. The numbers update as more sites are built.</p>

          <dl className="mt-10 grid grid-cols-2 lg:grid-cols-4 border-t border-l border-kapwa-brand-900">
            {figures.map(([v, l]) => <div key={l} className="border-r border-b border-kapwa-brand-900 p-4 sm:p-5"><dd className="text-3xl sm:text-4xl font-display font-normal tracking-tight tabular-nums text-neutral-900">{v}</dd><dt className="mt-1 text-[13px] text-neutral-600">{l}</dt></div>)}
          </dl>

          <Sec n={n++} title="Why Kapwa" aside="One look for every government site">
            <p>BetterGov.ph volunteers built Kapwa so that Philippine government websites can share one look and one way of working, the way GOV.UK did for Britain. A resident who learns one site should be able to use the next.</p>
            <p>The hard part has never been the design system. It is adoption: every agency would have to rebuild its own site by hand. RE:GOV tests the other way round. An agent reads the old site and rebuilds it on Kapwa in minutes, so adoption costs the agency nothing but a review.</p>
          </Sec>

          <Sec n={n++} title="What RE:GOV uses" aside="Kapwa 1.4.1">
            <p>Every rebuilt site loads Kapwa&rsquo;s stylesheet: its colour scales, type and base styles. Everything a visitor sees is drawn with these colours.</p>
            <div className="mt-5 grid grid-cols-3 sm:grid-cols-6 border-t border-l border-neutral-200">
              {[["brand-900", "bg-kapwa-brand-900"], ["brand-700", "bg-kapwa-brand-700"], ["brand-50", "bg-kapwa-brand-50"], ["red-700", "bg-kapwa-red-700"], ["yellow-400", "bg-kapwa-yellow-400"], ["green-800", "bg-kapwa-green-800"]].map(([l, c]) => <div key={l} className="border-r border-b border-neutral-200 p-3"><div className={`h-10 ${c}`} /><div className="mt-2 font-mono text-[12px] text-neutral-600">kapwa-{l}</div></div>)}
            </div>
            <p className="mt-5">On top, RE:GOV adds an editorial layer so a site reads like a public document: square corners, ruled sections, numbered indexes and a flat navy masthead. The components themselves, the header, navigation and all twelve content blocks, are RE:GOV&rsquo;s own. <span className="font-semibold text-neutral-900">Today no Kapwa React component is used.</span> The rest of this page explains why, and what would change that.</p>
          </Sec>

          <Sec n={n++} title="What the sites contain" aside={`${study.sites} sites, every block counted`}>
            <p>Muse Spark sorts every piece of content on every page into one of twelve block types. Across all the sites RE:GOV has rebuilt, this is what Philippine government pages are made of, and whether Kapwa has a component for it:</p>
            <div className="mt-5 overflow-x-auto" tabIndex={0} role="region" aria-label="Content types across rebuilt sites">
              <table className="w-full min-w-[36rem] text-[15px]">
                <thead><tr className="border-b-2 border-kapwa-brand-900 text-left"><th className="py-2 pr-3 font-semibold">Content</th><th className="py-2 px-3 text-right font-semibold">Blocks</th><th className="py-2 px-3 font-semibold w-1/4">Share</th><th className="py-2 px-3 text-right font-semibold">Sites</th><th className="py-2 pl-3 font-semibold">In Kapwa</th></tr></thead>
                <tbody>
                  {study.types.map((t) => {
                    const [fit, what] = MATCH[t.type] ?? ["missing", "—"];
                    return (
                      <tr key={t.type} className="border-b border-neutral-200 align-top">
                        <td className="py-2 pr-3 text-neutral-900">{TYPE_LABEL[t.type] ?? t.type}</td>
                        <td className="py-2 px-3 text-right tabular-nums">{t.blocks.toLocaleString("en-PH")}</td>
                        <td className="py-2 px-3"><div className="flex items-center gap-2"><div className="h-2 bg-kapwa-brand-900" style={{ width: `${Math.max(2, (t.blocks / study.types[0].blocks) * 100)}%` }} /><span className="text-xs tabular-nums text-neutral-500">{pct(t.blocks)}</span></div></td>
                        <td className="py-2 px-3 text-right tabular-nums">{t.sites}</td>
                        <td className="py-2 pl-3"><span className={`px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${chip[fit]}`}>{chipLabel[fit]}</span> <span className="text-[13px] text-neutral-600">{what !== "—" ? what : ""}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Sec>

          <Sec n={n++} title="Fit check" aside="Every Kapwa 1.4.1 component, tried against real content">
            <ul className="divide-y divide-neutral-200 border-y border-neutral-200">
              {FIT.map(([name, fit, why]) => (
                <li key={name} className="grid gap-x-6 gap-y-1 py-3 sm:grid-cols-[13rem_1fr]">
                  <span className="font-semibold text-neutral-900">{name} <span className={`ml-1 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${chip[fit]}`}>{chipLabel[fit]}</span></span>
                  <span className="text-[15px]">{why}</span>
                </li>
              ))}
            </ul>
          </Sec>

          <Sec n={n++} title="What made it hard" aside="Using a design system from an agent">
            <ol className="space-y-4">
              {[
                ["Components shaped around sample data.", "Table and List take fixed fields, so they can show a demo but not a fee schedule. An agent needs components that accept any rows and any items of a known shape."],
                ["No machine-readable catalogue.", "To pick a component, a model needs to know which content each one is for, what it requires and what it does without JavaScript. RE:GOV had to write its own typed schema of twelve blocks for Muse Spark to fill in."],
                ["Required fields invite invention.", "If a component insists on a field the source never had, a model will fill it. On a government site that is the one thing it must never do. Everything except the core content should be optional, with a sensible fallback."],
                ["Pages must work without JavaScript.", "Agencies may host the result as plain HTML. Callbacks such as onClick cannot cross into a server-rendered or static page, so components need link and <details> forms."],
                ["Shape by override.", "Square corners took an !important rule over every element. A radius token would let a theme change shape cleanly."],
                ["Same parts, same layout.", "A Kapwa contributor who reviewed the showcase found the sites rigid and alike, and modern sites such as eGovPH looked downgraded. Consistent should not mean identical."],
              ].map(([h, b], i) => <li key={h} className="grid grid-cols-[2rem_1fr] gap-x-3"><span className="font-semibold tabular-nums text-kapwa-brand-900">{nn(i)}</span><span><span className="font-semibold text-neutral-900">{h}</span> {b}</span></li>)}
            </ol>
          </Sec>

          {refined && refinedShot && (
            <Sec n={n++} title="Upgrade, don't replace" aside="The answer to “downgrade”">
              <p>RE:GOV now runs a design check before rebuilding. Muse Spark rates the old homepage; if it is already modern, the site keeps its brand colour, its hero and its softer shapes, and gets Kapwa&rsquo;s structure, accessibility and content work underneath. {study.design.checked ? `Of ${study.design.checked} sites checked so far, ${study.design.refined} ${study.design.refined === 1 ? "was" : "were"} upgraded this way.` : ""} eGovPH scored {refined.design!.score}/10:</p>
              <div className="mt-5 grid gap-6 lg:grid-cols-2">
                <figure>
                  <figcaption className={`${eyebrow} text-neutral-500 pb-2`}>Original · e.gov.ph</figcaption>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/jobs/${REFINED}/${refinedShot}`} alt="The original eGovPH homepage" className="w-full border border-neutral-300 object-cover object-top" style={{ aspectRatio: "1440/900" }} />
                </figure>
                <figure>
                  <figcaption className={`${eyebrow} text-neutral-500 pb-2`}>Upgraded · unofficial RE:GOV concept</figcaption>
                  <ScaledFrame src={href(REFINED)} title="The upgraded eGovPH concept" className="border border-kapwa-brand-900" />
                </figure>
              </div>
              <p className="mt-4">Next, homepages will be composed by kind of site and by what each one holds, so a town, a hospital and a university stop sharing one template while keeping the same parts.</p>
            </Sec>
          )}

          <Sec n={n++} title="Proposed components" aside="Drawn in RE:GOV's design system">
            <p>These are the patterns government sites use most that Kapwa does not have. RE:GOV already renders each one; below, each is shown live with real content from a rebuilt site, with the props a Kapwa version would need. Every field an agent might not know is optional.</p>
            <div className="mt-8 space-y-14">
              {PROPOSALS.filter((p) => study.examples[p.key]).map((p, i) => {
                const count = study.types.find((t) => t.type === p.key);
                return (
                  <article key={p.key} className="grid grid-cols-1 gap-x-10 gap-y-5 xl:grid-cols-[22rem_minmax(0,1fr)]">
                    <div>
                      <p className="text-[11px] font-semibold tabular-nums text-neutral-500">P-{String(i + 1).padStart(2, "0")}</p>
                      <h3 className="mt-1 font-mono text-xl text-neutral-900">{`<${p.name}>`}</h3>
                      {count && <p className="mt-1 text-[13px] text-neutral-500">{count.blocks.toLocaleString("en-PH")} blocks on {count.sites} sites</p>}
                      <p className="mt-3 text-[15px]">{p.why}</p>
                      <pre className="mt-4 whitespace-pre-wrap break-words bg-neutral-950 p-4 text-[12.5px] leading-relaxed text-neutral-100"><code>{p.props}</code></pre>
                    </div>
                    <Example ex={study.examples[p.key]} />
                  </article>
                );
              })}
              {study.charter && (
                <article className="grid grid-cols-1 gap-x-10 gap-y-5 xl:grid-cols-[22rem_minmax(0,1fr)]">
                  <div>
                    <p className="text-[11px] font-semibold tabular-nums text-neutral-500">P-{String(PROPOSALS.filter((p) => study.examples[p.key]).length + 1).padStart(2, "0")}</p>
                    <h3 className="mt-1 font-mono text-xl text-neutral-900">{"<ServicePage>"}</h3>
                    <p className="mt-3 text-[15px]">Every office must publish a Citizen&rsquo;s Charter, usually as a PDF. Muse Spark reads the PDF and RE:GOV renders each service as a page: at a glance, requirements, then the steps with fees and time. The fields mirror the Anti-Red Tape Act format, so one component would fit every agency.</p>
                    <pre className="mt-4 whitespace-pre-wrap break-words bg-neutral-950 p-4 text-[12.5px] leading-relaxed text-neutral-100"><code>{`title: string
office: string
whoMayAvail?: string
classification?: string
requirements: {
  item: string
  whereToSecure?: string
}[]
steps: {
  client: string
  agency?: string
  fee?: string
  time?: string
  responsible?: string
}[]
totalFees?: string
totalTime?: string
source: string`}</code></pre>
                  </div>
                  <figure className="min-w-0">
                    <ScaledFrame src={href(study.charter.jobId, study.charter.slug)} height={1100} title="A Citizen's Charter service page" className="border border-neutral-300" />
                    <figcaption className="mt-2 text-[13px] text-neutral-500">Live from <Link href={href(study.charter.jobId, study.charter.slug)} className="font-semibold text-neutral-700 hover:text-kapwa-brand-900">{study.charter.site}</Link>, built from its Citizen&rsquo;s Charter PDF.</figcaption>
                  </figure>
                </article>
              )}
              {study.hotlines && (
                <article className="grid grid-cols-1 gap-x-10 gap-y-5 xl:grid-cols-[22rem_minmax(0,1fr)]">
                  <div>
                    <p className="text-[11px] font-semibold tabular-nums text-neutral-500">P-{String(PROPOSALS.filter((p) => study.examples[p.key]).length + (study.charter ? 2 : 1)).padStart(2, "0")}</p>
                    <h3 className="mt-1 font-mono text-xl text-neutral-900">{"<Hotlines>"}</h3>
                    <p className="mt-3 text-[15px]">911 first, then the town&rsquo;s own numbers from BetterGov.ph&rsquo;s public dataset and the site, each one a tap-to-call link. Every town and city needs the same page.</p>
                    <pre className="mt-4 whitespace-pre-wrap break-words bg-neutral-950 p-4 text-[12.5px] leading-relaxed text-neutral-100"><code>{`place: string
numbers: {
  name: string
  number: string
  kind: "emergency" | "police" | "fire"
      | "medical" | "disaster" | "office"
}[]`}</code></pre>
                  </div>
                  <figure className="min-w-0">
                    <ScaledFrame src={href(study.hotlines.jobId, "hotlines")} title="An emergency hotlines page" className="border border-neutral-300" />
                    <figcaption className="mt-2 text-[13px] text-neutral-500">Live from <Link href={href(study.hotlines.jobId, "hotlines")} className="font-semibold text-neutral-700 hover:text-kapwa-brand-900">{study.hotlines.site}</Link>.</figcaption>
                  </figure>
                </article>
              )}
            </div>
          </Sec>

          <Sec n={n++} title="An AI-friendly Kapwa" aside="Suggestions for the design system">
            <ol className="space-y-3">
              {[
                ["A catalogue machines can read.", "One JSON file listing each component, the content it is for, its props as a schema and whether it needs JavaScript. An agent can then choose components the way a developer reads the docs."],
                ["Components for government content.", "Office contacts, step-by-step, officials, link directories, timelines, FAQs, service pages and hotlines: the patterns above cover most of what these sites hold."],
                ["Content-shaped props.", "Any rows for Table, any items for List, links as well as buttons, and every non-essential field optional."],
                ["Works without JavaScript.", "Links instead of callbacks, <details> for disclosure, so pages survive server rendering and static hosting."],
                ["Shape and density as tokens.", "Corner radius and spacing scales as tokens, so a theme such as RE:GOV's editorial one needs no overrides."],
              ].map(([h, b], i) => <li key={h} className="grid grid-cols-[2rem_1fr] gap-x-3"><span className="font-semibold tabular-nums text-kapwa-brand-900">{nn(i)}</span><span><span className="font-semibold text-neutral-900">{h}</span> {b}</span></li>)}
            </ol>
            <p className="mt-5">RE:GOV&rsquo;s twelve block types and their renderers are open source at <a href="https://github.com/rockyru/regov" className="font-semibold text-kapwa-brand-900 hover:underline">github.com/rockyru/regov</a> (<code className="text-[14px]">src/pipeline/schema.ts</code> and <code className="text-[14px]">src/components/site/Blocks.tsx</code>) for anyone who wants to take them further.</p>
          </Sec>

          <section className="mt-16 border-t-2 border-kapwa-brand-900 bg-kapwa-brand-50 p-6 sm:p-8">
            <h2 className="text-3xl font-display font-normal tracking-tight text-neutral-900">See it on a real site</h2>
            <p className="mt-2 max-w-2xl text-neutral-700">Browse every rebuilt site in the showcase, read <Link href="/how-it-works" className="font-semibold text-kapwa-brand-900 hover:underline">how the agent works</Link>, or try your own address.</p>
            <div className="mt-5 flex flex-wrap gap-3"><Link href="/showcase" className={btn.primary}>Open the showcase →</Link><Link href="/#reimagine" className={btn.ghost}>Reimagine a site</Link></div>
          </section>

          <p className="mt-8 max-w-3xl text-[13px] text-neutral-500">Kapwa is made by BetterGov.ph volunteers. RE:GOV is an independent project that uses it; it is not part of BetterGov.ph, and the component proposals here are RE:GOV&rsquo;s, not Kapwa&rsquo;s. Rebuilt sites are unofficial, AI-generated concepts, not affiliated with the agencies they come from.</p>
        </div>
      </main>
      <AppFooter />
    </>
  );
}
