import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { listJobs, loadSite } from "@/lib/jobs";
import { projectsFor } from "@/lib/wikibayan";
import { NATIONAL_HOTLINES } from "@/lib/civic";
import type { SiteModel, SitePage } from "@/pipeline/schema";
import { AppHeader, AppFooter, SectionHead as AppSectionHead, eyebrow, btn } from "@/components/AppShell";
import { JobCard, cardGrid } from "@/components/JobCard";
import { ReimagineBox } from "@/components/ReimagineBox";
import { LogoLoader } from "@/components/LogoLoader";
import { PrintButton } from "@/components/PrintButton";
import { ModelsPanel } from "@/components/ModelsPanel";
import { PortalShowcase } from "@/components/PortalShowcase";
import { CoastMap } from "@/components/explore/CoastMap";
import { EventStatus } from "@/components/explore/EventStatus";
import { PlacesWhere } from "@/components/explore/Places";
import { getMaps, getPortal, portalSlugs } from "@/lib/explore";
import { LiquidGlass } from "@/components/explore/LiquidGlass";
import { GeoSvg } from "@/components/explore/GeoSvg";
import "../explore/explore.css";
import { ScaledFrame } from "@/components/ScaledFrame";
import { GovStrip, Header, Footer, PreviewBar } from "@/components/site/Shell";
import { SectionHead, Tags } from "@/components/site/Pages";
import { Block } from "@/components/site/Blocks";
import { Markdown } from "@/components/site/Markdown";
import { CivicStrip, HotlineTable, TransparencySection } from "@/components/site/Civic";
import { ProjectList, ProjectsOnRecord, COMMUNITY_NOTE, PROJECTS_SLUG } from "@/components/site/Projects";
import { brandScale } from "@/components/site/theme";

export const dynamic = "force-dynamic";
export const metadata = { title: "Design system", description: "The RE:GOV design system: the app at regov.app and the sites it rebuilds, rendered live.", robots: { index: false, follow: false } };

// Specimens use the fictional sample town (fixtures/sample) and, where real data reads better, a real rebuild.
const SAMPLE = "sample";
const REAL = "marikina-gov-ph-mvqbky5l";
const ART = "e-gov-ph-mvq8z9ew";

async function sampleSite(): Promise<{ site: SiteModel; installed: boolean }> {
  const site = await loadSite(SAMPLE);
  if (site) return { site, installed: true };
  const raw = JSON.parse(await readFile(join(process.cwd(), "fixtures/sample/site.json"), "utf8")) as SiteModel;
  return { site: { ...raw, assets: { ...raw.assets, logo: "", band: undefined } }, installed: false };
}

type B = SitePage["blocks"][number];
const it = (title: string, description = "", meta = "", href = "") => ({ title, description, meta, href });
const BLOCKS: { type: B["type"]; note: string; block: B }[] = [
  { type: "richtext", note: "Migrated prose. Every titled block opens with a heavy black rule.", block: { type: "richtext", heading: "About the municipality", body_markdown: "Bayan ng Halimbawa is a **fictional** fourth-class municipality used to test RE:GOV. It has four barangays and a [municipal hall](/contact) open on weekdays.", items: [] } },
  { type: "cards", note: "Gridline cards: per-cell borders, never gap-px backgrounds. Blue wash on hover.", block: { type: "cards", heading: "Popular services", body_markdown: "", items: [it("Business permit", "New and renewal applications for businesses in the municipality.", "Permits", "/services/business-permit"), it("Civil registry", "Birth, marriage and death certificates.", "Records"), it("Real property tax", "Assessment and payment of property tax.", "Payments")] } },
  { type: "people", note: "Portrait when one was migrated, otherwise initials on navy. Position in a blue eyebrow.", block: { type: "people", heading: "Municipal officials", body_markdown: "", items: [it("Maria Santos", "Chief executive of the municipality.", "Municipal Mayor"), it("Jose Reyes", "Presides over the Sangguniang Bayan.", "Vice Mayor")] } },
  { type: "steps", note: "Numbered navy squares, 01, 02…", block: { type: "steps", heading: "How to apply for a business permit", body_markdown: "", items: [it("Fill in the application form", "Available at the Business Permits and Licensing Office.", "Form BP-01"), it("Submit your requirements", "DTI or SEC registration, barangay clearance, lease contract."), it("Pay the fees", "At the Municipal Treasurer's Office.", "Window 3")] } },
  { type: "list", note: "Short dash markers; linked items underline in brand blue.", block: { type: "list", heading: "Requirements", body_markdown: "", items: [it("Barangay business clearance", "", "", "/services/business-permit"), it("DTI or SEC registration", "", "Original and photocopy"), it("Community tax certificate", "issued this year")] } },
  { type: "links", note: "Under eight links: a ruled list with an arrow or file-type badge.", block: { type: "links", heading: "Downloadable forms", body_markdown: "", items: [it("Business permit application", "", "", "/files/bp-01.pdf"), it("Citizen's Charter 2026", "", "", "/files/charter.pdf"), it("Online appointment", "Book a slot at the municipal hall.", "", "/contact")] } },
  { type: "links", note: "Eight or more links: a directory in columns, grouped by repeated meta, with counts.", block: { type: "links", heading: "Ordinances", body_markdown: "", items: [it("Ordinance 2026-01", "", "2026", "/files/o-2026-01.pdf"), it("Ordinance 2026-02", "", "2026", "/files/o-2026-02.pdf"), it("Ordinance 2026-03", "", "2026", "/files/o-2026-03.pdf"), it("Ordinance 2025-11", "", "2025", "/files/o-2025-11.pdf"), it("Ordinance 2025-12", "", "2025", "/files/o-2025-12.pdf"), it("Ordinance 2025-14", "", "2025", "/files/o-2025-14.pdf"), it("Executive order 12", "", "Executive orders", "/files/eo-12.pdf"), it("Executive order 13", "", "Executive orders", "/files/eo-13.pdf"), it("Revenue code", "Consolidated, as amended.", "", "/files/revenue-code.docx")] } },
  { type: "faq", note: "Native details/summary; the + turns into ×.", block: { type: "faq", heading: "Frequently asked questions", body_markdown: "", items: [it("How long does a renewal take?", "Usually one working day once the fees are paid."), it("Can I pay online?", "Not yet. Payments are made at the Treasurer's Office.")] } },
  { type: "timeline", note: "Square dots on a black line; the date leads.", block: { type: "timeline", heading: "Flood drill 2026", body_markdown: "", items: [it("Briefing at the municipal hall", "All barangay captains and responders.", "June 2"), it("Evacuation drill", "Barangays San Isidro and Poblacion.", "June 9"), it("Review and report", "Findings posted on this site.", "June 20")] } },
  { type: "contact", note: "Light-blue panel. Emails, phone numbers and websites become tap targets.", block: { type: "contact", heading: "Municipal hall", body_markdown: "", items: [it("Address", "Rizal Street, Poblacion, Halimbawa"), it("Phone", "(02) 8123 4567"), it("Email", "info@halimbawa.example"), it("Office hours", "Monday to Friday, 8:00 AM to 5:00 PM")] } },
  { type: "callout", note: "Yellow wash, thick yellow left edge. For notices and deadlines.", block: { type: "callout", heading: "Renewal deadline", body_markdown: "Business permits must be renewed by **January 20**. A 25% surcharge applies after that date.", items: [] } },
  { type: "table", note: "GFM table in prose-gov. On phones each row becomes a card with labelled cells.", block: { type: "table", heading: "Permit fees", body_markdown: "| Business size | New | Renewal |\n|---|---|---|\n| Micro | ₱500 | ₱400 |\n| Small | ₱1,200 | ₱1,000 |\n| Medium | ₱3,000 | ₱2,500 |", items: [] } },
  { type: "image", note: "Text that only existed inside an image on the old site, transcribed and marked as such.", block: { type: "image", heading: "Poster: Clean-up drive", body_markdown: "Join the clean-up drive on **Saturday, 7:00 AM** at the plaza. Bring gloves and a sack.", items: [] } },
];

const SWATCHES: { name: string; use: string; chips: [string, string][] }[] = [
  { name: "Brand", use: "Nav bar (900), masthead strip and dark panels (950), links (700–800), hover washes (50)", chips: [["50", "bg-kapwa-brand-50"], ["100", "bg-kapwa-brand-100"], ["200", "bg-kapwa-brand-200"], ["300", "bg-kapwa-brand-300"], ["400", "bg-kapwa-brand-400"], ["500", "bg-kapwa-brand-500"], ["600", "bg-kapwa-brand-600"], ["700", "bg-kapwa-brand-700"], ["800", "bg-kapwa-brand-800"], ["900", "bg-kapwa-brand-900"], ["950", "bg-kapwa-brand-950"]] },
  { name: "Red", use: "Emergency strip and 911 (700–900), file badges (50 + 700), the GOVPH flag mark (600)", chips: [["50", "bg-kapwa-red-50"], ["600", "bg-kapwa-red-600"], ["700", "bg-kapwa-red-700"], ["800", "bg-kapwa-red-800"], ["900", "bg-kapwa-red-900"]] },
  { name: "Yellow", use: "Search button and nav underline (400), callouts (50), unofficial notice on dark", chips: [["50", "bg-kapwa-yellow-50"], ["300", "bg-kapwa-yellow-300"], ["400", "bg-kapwa-yellow-400"]] },
  { name: "Green and orange", use: "Status only: completed, live counts (green); delayed (orange)", chips: [["green 400", "bg-kapwa-green-400"], ["green 500", "bg-kapwa-green-500"], ["green 800", "bg-kapwa-green-800"], ["orange 700", "bg-kapwa-orange-700"]] },
  { name: "Neutral", use: "Ink (900), body (700–800), secondary (500–600), hairlines (200), footer (950)", chips: [["50", "bg-neutral-50"], ["100", "bg-neutral-100"], ["200", "bg-neutral-200"], ["300", "bg-neutral-300"], ["400", "bg-neutral-400"], ["500", "bg-neutral-500"], ["600", "bg-neutral-600"], ["700", "bg-neutral-700"], ["800", "bg-neutral-800"], ["900", "bg-neutral-900"], ["950", "bg-neutral-950"]] },
];

const TOC = [
  { part: "RE:GOV app", items: [["brand", "Brand"], ["app-type", "Type"], ["app-components", "Components"], ["app-more", "More components"], ["app-pages", "App pages"]] },
  { part: "Reimagined sites", items: [["foundations", "Foundations"], ["shell", "Shell"], ["parts", "Page parts"], ["blocks", "Content blocks"], ["civic", "Civic"], ["pages", "Whole pages"]] },
  { part: "Explore kit", items: [["xp-foundations", "Foundations"], ["xp-components", "Components"], ["xp-more", "Sections and maps"], ["xp-pages", "Pages"]] },
] as const;

/** A full page, scaled down, with a link to open it. */
function Frame({ name, src, file }: { name: string; src: string; file: string }) {
  return (
    <figure>
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 border-b border-neutral-900 pb-2"><a href={src} className="font-semibold text-neutral-900 hover:text-kapwa-brand-900">{name} ↗</a><code className="text-[12px] text-neutral-500">{file}</code></figcaption>
      <ScaledFrame src={src} title={name} className="mt-3 border border-neutral-300" />
    </figure>
  );
}

/** Divider between the two halves of the page. */
function Part({ n, title, deck }: { n: string; title: string; deck: string }) {
  return (
    <div className="mt-20 bg-kapwa-brand-900 px-6 py-8 sm:px-10 text-white">
      <div className={`${eyebrow} text-kapwa-yellow-400`}>Part {n}</div>
      <h2 className="mt-2 font-display font-normal text-4xl sm:text-5xl tracking-tight">{title}</h2>
      <p className="mt-3 max-w-3xl text-white/80">{deck}</p>
    </div>
  );
}

/** One component on show: its name, where it lives, what it is for, then the real thing. */
function Specimen({ name, file, note, children, bleed }: { name: string; file: string; note?: string; children: React.ReactNode; bleed?: boolean }) {
  return (
    <figure className="mt-10">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-neutral-900 pb-2">
        <span className="font-semibold text-neutral-900">{name}</span>
        <code className="text-[12px] text-neutral-500">{file}</code>
      </figcaption>
      {note && <p className="mt-2 max-w-3xl text-[15px] text-neutral-600">{note}</p>}
      <div className={`editorial site-shell mt-4 border border-neutral-300 bg-white ${bleed ? "" : "p-5 sm:p-8"}`}>{children}</div>
    </figure>
  );
}

export default async function DesignSystem() {
  const { site, installed } = await sampleSite();
  const real = await loadSite(REAL);
  const projects = real ? (await projectsFor(real)).slice(0, 3) : [];
  const art = await loadSite(ART);
  const green = brandScale("#0f7b4f");
  const built = (await listJobs()).filter((j) => j.site && j.crawl).slice(0, 3);
  const xpSlug = portalSlugs()[0];
  const portal = xpSlug ? getPortal(xpSlug) : null;
  const maps = xpSlug ? getMaps(xpSlug) : null;
  const cards = BLOCKS.find((b) => b.type === "cards")!.block;
  let n = 1;
  return (
    <>
      <AppHeader crumb="Design system" />
      <main className="flex-1 container-gov py-12">
        <div className={`${eyebrow} text-kapwa-brand-900`}>RE:GOV</div>
        <h1 className="mt-3 text-5xl sm:text-6xl font-display font-normal tracking-tight leading-[0.95] text-neutral-900">Design system</h1>
        <p className="mt-5 max-w-3xl text-lg text-neutral-600 leading-snug">One family in three dialects. The <strong className="font-semibold text-neutral-900">RE:GOV app</strong> (regov.app: home, jobs, reports, showcase), the <strong className="font-semibold text-neutral-900">reimagined sites</strong> it builds, and the <strong className="font-semibold text-neutral-900">Explore kit</strong> for tourism portals. The first two share Kapwa (BetterGov.ph) colour, Inter, square corners, heavy rules and numbered sections; Explore is the dark, photographic exception. Everything below is rendered live from the real components. The rules behind it, for people and coding agents, are in <a href="https://github.com/rockyru/regov/tree/main/.claude/skills/regov-design-system" className="underline decoration-neutral-400 underline-offset-4 hover:decoration-neutral-900"><code className="text-[15px]">.claude/skills/regov-design-system</code></a>.</p>
        <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3 text-[15px]">
          <a href="https://github.com/rockyru/regov/blob/main/docs/design-system.md" className="inline-flex h-11 items-center gap-2 bg-kapwa-brand-900 px-5 font-semibold text-white hover:bg-kapwa-brand-950">How to use it ↗</a>
          <a href="https://github.com/rockyru/regov/tree/main/.claude/skills/regov-design-system" className="font-semibold text-neutral-900 border-b-2 border-neutral-900 hover:text-kapwa-brand-900">Get the skill on GitHub ↗</a>
          <span className="text-neutral-500">Install it, use it with Claude Code, Cursor or Copilot, or build an Explore portal</span>
        </div>
        <nav aria-label="Sections" className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {TOC.map((g, gi) => (
            <div key={g.part}>
              <div className={`${eyebrow} text-neutral-500 border-b border-neutral-900 pb-2`}>Part {"ABC"[gi]} · {g.part}</div>
              <ul className="mt-3 flex flex-wrap gap-2">
                {g.items.map(([id, label]) => <li key={id}><a href={`#${id}`} className="inline-flex border border-neutral-300 px-3.5 py-1.5 text-sm font-medium text-neutral-800 hover:border-neutral-900">{label}</a></li>)}
              </ul>
            </div>
          ))}
        </nav>

        <Part n="A" title="The RE:GOV app" deck="regov.app itself. Themed in BetterGov blue: blue rules and buttons, a display face for headings, white pages with no background blocks." />

        {/* Brand */}
        <section id="brand" className="pt-12 scroll-mt-20">
          <AppSectionHead n={n++} title="Brand" deck="The lockup and mark live in public/brand, generated from the outlined logo. Never set the wordmark in type: the logo face is not licensed for the web." />
          <Specimen name="Lockup" file="public/brand/logo.svg · logo-white.svg · Wordmark in AppShell.tsx" note="Blue mark and “re”, red colon, ink “gov”, grey tagline. On navy: white, with a yellow colon.">
            <div className="grid gap-px bg-neutral-200 sm:grid-cols-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <div className="grid place-items-center bg-white p-10"><img src="/brand/logo.svg" alt="RE:GOV lockup on white" className="h-16 w-auto" /></div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <div className="grid place-items-center bg-kapwa-brand-900 p-10"><img src="/brand/logo-white.svg" alt="RE:GOV lockup on navy" className="h-16 w-auto" /></div>
            </div>
          </Specimen>
          <Specimen name="Mark" file="public/brand/mark.svg · mark-ink.svg · mark-white.svg · src/app/icon.svg" note="Blue for the favicon and app icon, ink inside the amber unofficial bar, white on navy.">
            <div className="flex flex-wrap items-center gap-px bg-neutral-200 w-max">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <span className="grid size-28 place-items-center bg-white"><img src="/brand/mark.svg" alt="Blue mark" className="h-14 w-auto" /></span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <span className="grid size-28 place-items-center bg-amber-400"><img src="/brand/mark-ink.svg" alt="Ink mark" className="h-14 w-auto" /></span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <span className="grid size-28 place-items-center bg-kapwa-brand-900"><img src="/brand/mark-white.svg" alt="White mark" className="h-14 w-auto" /></span>
            </div>
          </Specimen>
        </section>

        <section id="app-type" className="pt-16 scroll-mt-20">
          <AppSectionHead n={n++} title="Type" deck="Headings in the display face at regular weight; everything else in Inter, as on the rebuilt sites." />
          <Specimen name="Display and text" file="src/app/layout.tsx · --font-display in globals.css" note="--font-display is Optima from the system (every Mac and iPhone), falling back to Belleza from Google Fonts. Never bold. Fraunces and the logo face were tried and dropped.">
            <dl className="divide-y divide-neutral-200">
              {[
                ["Hero", <span key="a" className="text-5xl sm:text-6xl xl:text-[84px] font-display font-normal tracking-tight leading-[0.95] text-neutral-900">Reimagine <span className="text-kapwa-brand-900">Government</span>.</span>],
                ["Page title", <span key="b" className="text-4xl sm:text-5xl font-display font-normal tracking-tight">From an old address to a new site</span>],
                ["Card title", <span key="c" className="font-display font-normal leading-snug text-neutral-900 text-[22px] tracking-tight">Municipality of Halimbawa</span>],
                ["Kicker", <span key="d" className={`${eyebrow} text-kapwa-brand-900`}>How it works</span>],
                ["Body", <span key="e" className="text-lg text-neutral-600 leading-snug">Public websites deserve a second life. Inter, neutral-600, generous leading.</span>],
              ].map(([k, v]) => <div key={k as string} className="grid gap-2 py-4 sm:grid-cols-[12rem_1fr] sm:items-baseline"><dt className="text-sm text-neutral-500">{k}</dt><dd className="min-w-0">{v}</dd></div>)}
            </dl>
          </Specimen>
        </section>

        <section id="app-components" className="pt-16 scroll-mt-20">
          <AppSectionHead n={n++} title="Components" deck="Shared primitives from src/components. The header and footer of this page are AppHeader and AppFooter; below lg the header links move to a floating bottom bar." />
          <Specimen name="SectionHead (app)" file="src/components/AppShell.tsx" note="Blue heavy rule; the number sits inline with a small title, an optional deck below and an aside on the right.">
            <AppSectionHead n={2} title="Recently reimagined" deck="Sites the agent rebuilt most recently." aside={<span className="tabular-nums">12 sites · View the showcase →</span>} />
          </Specimen>
          <Specimen name="btn" file="src/components/AppShell.tsx" note="Square buttons, 44px tall. Primary blue, yellow for the one call to action on dark, ghost for secondary; btn.sm for compact rows.">
            <div className="flex flex-wrap items-center gap-4">
              <a href="#app-components" className={btn.primary}>Open the concept →</a>
              <a href="#app-components" className={btn.yellow}>Reimagine a site</a>
              <a href="#app-components" className={btn.ghost}>Read the report</a>
              <a href="#app-components" className={`${btn.sm} bg-kapwa-brand-900 text-white hover:bg-kapwa-brand-950`}>Small</a>
              <a href="#app-components" className="font-semibold text-neutral-900 border-b-2 border-neutral-900 hover:text-kapwa-brand-900">Text link</a>
            </div>
          </Specimen>
          <Specimen name="ReimagineBox" file="src/components/ReimagineBox.tsx" note="The one input on the home page: thick blue frame, attached submit, errors in red below. Checks for a government domain before posting, and waits for Turnstile when a sitekey is set. Disabled here.">
            <div inert className="mx-auto max-w-2xl"><ReimagineBox /></div>
          </Specimen>
          <Specimen name="JobCard + cardGrid" file="src/components/JobCard.tsx" note="Gridline cards in blue: the list draws the top and left rules, each card its right and bottom. Cover art, numbered kind tag, seal, display-face title. Real rebuilds.">
            {built.length ? <ul className={`${cardGrid} sm:grid-cols-2 lg:grid-cols-3`}>{built.map((j, i) => <JobCard key={j.id} index={i} id={j.id} site={j.site!} crawl={j.crawl!} />)}</ul> : <p className="text-sm text-neutral-600">No rebuilds on this machine yet.</p>}
          </Specimen>
          <Specimen name="QueueStrip and Reveal" file="src/components/QueueStrip.tsx · src/components/Reveal.tsx" note="QueueStrip is the yellow band under the header while runs are queued; it updates itself in place and hides when the queue is empty, so a static copy stands in here. Reveal fades sections up as they scroll in, and turns off under reduced motion.">
            <section className="border-b border-kapwa-yellow-400/60 bg-kapwa-yellow-50 -m-5 sm:-m-8">
              <div className="px-5 py-3 flex flex-wrap gap-x-8 gap-y-2 text-sm"><span className="inline-flex items-center gap-2 font-semibold text-kapwa-brand-900"><span className="size-2 bg-kapwa-brand-600 animate-pulse" />Reimagining example.gov.ph · Rebuilding pages</span><span className="inline-flex items-center gap-2 font-semibold text-neutral-700"><span className="size-2 bg-kapwa-yellow-400" />In queue: 1. example.edu.ph</span></div>
            </section>
          </Specimen>
        </section>

        <section id="app-more" className="pt-16 scroll-mt-20">
          <AppSectionHead n={n++} title="More app components" deck="Loading, printing, the run's model trail and the Explore entry card." />
          <Specimen name="LogoLoader" file="src/components/LogoLoader.tsx" note="Page-transition loader (loading.tsx): the mark inside a spinning ring. SVG, so the square-corner rule leaves the ring round. Static under reduced motion."><LogoLoader label="Loading (specimen)" /></Specimen>
          <Specimen name="PrintButton" file="src/components/PrintButton.tsx" note="On the report, styled as a quiet ghost button. Print styles hide the nav and plain the links."><PrintButton className={`${btn.ghost} border-neutral-300 text-neutral-600 hover:border-kapwa-brand-900`} /></Specimen>
          {real && <Specimen name="ModelsPanel" file="src/components/ModelsPanel.tsx" note="On the job page: what each Meta model did for one site and how their outputs fed each other, read from the run's own files. Real run: the Marikina rebuild."><ModelsPanel jobId={REAL} site={real} /></Specimen>}
          {xpSlug && <Specimen name="PortalShowcase" file="src/components/PortalShowcase.tsx" note="One portal on the /explore index: a large print of the town and its four parts, each a door into that section. Counts come from the portal's data."><PortalShowcase slug={xpSlug} i={0} /></Specimen>}
          <Specimen name="Present everywhere, not staged" file="src/components" note="These work without a visible box of their own, or need an operator.">
            <dl className="divide-y divide-neutral-200 text-[15px]">
              {[
                ["FeedbackBox", "The floating Feedback button on every app page (bottom right of this one). Opens a short form behind Turnstile."],
                ["Turnstile", "Cloudflare's check on the URL box and feedback form. Invisible unless Cloudflare needs the visitor to act."],
                ["LiveRefresh", "Re-renders the job page in place while a run is going; pauses in a hidden tab. Never used for whole-page reloads."],
                ["ShowcaseList", "Search box and type chips over the showcase entries. See the Showcase preview under App pages."],
                ["SiteEditor", "The operator-only review editor at /edit (needs the admin token), so it is not shown here."],
                ["Reveal", "Fades sections up as they scroll in on the home page; off under reduced motion."],
              ].map(([k, v]) => <div key={k} className="grid gap-1 py-3 sm:grid-cols-[12rem_1fr]"><dt className="font-semibold text-neutral-900">{k}</dt><dd className="text-neutral-600">{v}</dd></div>)}
            </dl>
          </Specimen>
        </section>

        <section id="app-pages" className="pt-16 scroll-mt-20">
          <AppSectionHead n={n++} title="App pages" deck="Report and showcase read as formal documents: letterhead, numbered sections with the title in a left column, finding IDs, compact two-column registers." />
          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            <Frame name="Home" src="/" file="src/app/page.tsx" />
            <Frame name="Showcase" src="/showcase" file="src/app/showcase" />
            {installed && <Frame name="Migration report" src={`/report/${SAMPLE}`} file="src/app/report" />}
            <Frame name="LegalPage (How it works)" src="/how-it-works" file="src/components/LegalPage.tsx" />
          </div>
        </section>

        <Part n="B" title="Reimagined sites" deck="What the agent builds at /preview. Navy masthead, black rules, Kapwa tokens; refine sites take their own colour through brandScale(), art-directed sites restyle the same blocks." />

        {/* Foundations */}
        <section id="foundations" className="pt-12 scroll-mt-20">
          <AppSectionHead n={n++} title="Foundations" deck="Tokens and rules every component follows." />

          <Specimen name="Colour" file="@bettergov/kapwa · src/app/globals.css">
            <div className="space-y-6">
              {SWATCHES.map((s) => (
                <div key={s.name}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-6"><span className={`${eyebrow} text-neutral-900`}>{s.name}</span><span className="text-sm text-neutral-600">{s.use}</span></div>
                  <ul className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] border-t border-l border-neutral-200 *:border-r *:border-b *:border-neutral-200">
                    {s.chips.map(([label, cls]) => <li key={cls}><span className={`block h-14 ${cls}`} /><span className="block px-2 py-1.5 text-[12px] tabular-nums text-neutral-700">{label}</span></li>)}
                  </ul>
                </div>
              ))}
            </div>
          </Specimen>

          <Specimen name="Type" file="Inter via --font-sans · sizes from Pages.tsx, Blocks.tsx, Civic.tsx">
            <dl className="divide-y divide-neutral-200">
              {[
                ["Page title", <span key="a" className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-[-0.02em] leading-[1.0] text-neutral-900">Emergency hotlines</span>],
                ["Section title", <span key="b" className="font-bold tracking-tight text-neutral-900 text-3xl sm:text-4xl leading-[1.05]">News and updates</span>],
                ["Block heading", <span key="c" className="text-2xl sm:text-[28px] font-bold tracking-tight leading-tight text-neutral-900">How to apply</span>],
                ["Body (prose-gov)", <span key="d" className="prose-gov block">Migrated text sits at 17px with relaxed leading, links underlined in <a href="#foundations">brand blue</a>.</span>],
                ["Secondary", <span key="e" className="text-[15px] text-neutral-600">Descriptions, decks and card text at 15px in neutral-600.</span>],
                ["Eyebrow", <span key="f" className={`${eyebrow} text-kapwa-brand-700`}>01 · Section</span>],
                ["Figures", <span key="g" className="text-xl font-bold tracking-tight tabular-nums">(02) 8123 4567 · 911</span>],
              ].map(([k, v]) => <div key={k as string} className="grid gap-2 py-4 sm:grid-cols-[12rem_1fr] sm:items-baseline"><dt className="text-sm text-neutral-500">{k}</dt><dd className="min-w-0">{v}</dd></div>)}
            </dl>
            <p className="mt-4 text-sm text-neutral-600">Letter-spaced uppercase is for eyebrows only, never for ordinary text.</p>
          </Specimen>

          <Specimen name="Shape, rules and accents" file="globals.css (.editorial, .site-shell)" note="Corners are square everywhere: .editorial forces border-radius: 0 on every descendant, Kapwa components included. Structure comes from rules, not shadows or boxes.">
            <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-4">
              <div><div className="border-t-2 border-neutral-900 pt-3 font-semibold">Heavy rule</div><p className="mt-1 text-sm text-neutral-600">2px ink above every section and titled block.</p></div>
              <div><div className="border-t border-neutral-200 pt-3 font-semibold">Hairline</div><p className="mt-1 text-sm text-neutral-600">1px neutral-200 between rows and cells.</p></div>
              <div><div className="border-t-4 border-kapwa-yellow-400 pt-3 font-semibold">Yellow accent</div><p className="mt-1 text-sm text-neutral-600">Nav hover underline, mega-menu top, focus ring.</p></div>
              <div><div className="border-l-4 border-kapwa-yellow-400 bg-kapwa-yellow-50 p-3 font-semibold">Left edge</div><p className="mt-1 text-sm text-neutral-600">4px left border marks notices and stats.</p></div>
            </div>
          </Specimen>

          <Specimen name="Links and buttons" file="Shell.tsx · Blocks.tsx · Pages.tsx">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-5">
              <button type="button" className="h-10 bg-kapwa-yellow-400 px-4 text-sm font-bold text-kapwa-brand-950 hover:bg-kapwa-yellow-300">Search</button>
              <a href="#foundations" className="inline-block font-semibold text-kapwa-brand-800 border-b-2 border-kapwa-brand-800 hover:text-kapwa-brand-950">Overview →</a>
              <a href="#foundations" className="font-medium text-kapwa-brand-800 underline underline-offset-2 decoration-kapwa-brand-300 hover:decoration-kapwa-brand-800">Inline link</a>
              <span className="bg-neutral-950 p-3"><a href="#foundations" className="inline-flex items-center gap-2 border border-white/20 px-4 py-2.5 text-sm font-medium text-neutral-100 hover:bg-white/10 hover:border-white/40">Footer pill</a></span>
              <span className="shrink-0 bg-kapwa-red-50 px-1.5 py-0.5 text-[10px] font-bold text-kapwa-red-700">PDF</span>
            </div>
          </Specimen>

          <Specimen name="brandScale(): refine sites" file="src/components/site/theme.ts" note="A site that was already modern keeps its own colour. brandScale() rewrites every kapwa-brand-* variable from that one primary, so the same block re-themes itself. Left: Kapwa blue. Right: a green primary.">
            <div className="grid gap-8 lg:grid-cols-2">
              <div data-blocks><Block block={cards} jobId={site.jobId} origin={site.origin} /></div>
              <div data-blocks style={green}><Block block={cards} jobId={site.jobId} origin={site.origin} /><p className="mt-4"><span className="inline-block bg-kapwa-brand-900 px-4 py-2 text-sm font-semibold text-white">brand-900</span> <span className="inline-block bg-kapwa-brand-950 px-4 py-2 text-sm font-semibold text-white">brand-950</span></p></div>
            </div>
          </Specimen>
        </section>

        {/* Shell */}
        <section id="shell" className="pt-16 scroll-mt-20">
          <AppSectionHead n={n++} title="Shell" deck="The frame around every page, top to bottom." />
          <Specimen bleed name="PreviewBar" file="src/components/site/Shell.tsx" note="Always first. The amber unofficial badge is mandatory on every page."><PreviewBar site={site} /></Specimen>
          <Specimen bleed name="GovStrip" file="src/components/site/Shell.tsx" note="Navy GOVPH strip: flag mark, government links, English/Filipino switch."><GovStrip jobId={site.jobId} lang="en" here="/design-system" /></Specimen>
          <Specimen bleed name="Header" file="src/components/site/Shell.tsx" note="Seal and name (over the Muse Image band when there is one), then the sticky blue nav. Hover a section for its mega menu. On phones this hands over to MobileNav, shown under Whole pages."><Header site={site} /></Specimen>
          <Specimen bleed name="Footer" file="src/components/site/Shell.tsx" note="Five columns, then the unofficial notice, which must never be removed."><div className="[&>footer]:mt-0"><Footer site={site} /></div></Specimen>
        </section>

        {/* Page parts */}
        <section id="parts" className="pt-16 scroll-mt-20">
          <AppSectionHead n={n++} title="Page parts" deck="Pieces the page templates compose." />
          <Specimen name="SectionHead" file="src/components/site/Pages.tsx" note="Numbered eyebrow, heavy rule, title left, deck right. Homepage sections count up 01, 02…"><SectionHead n={0} title="Programs offered" deck="Degree, training and assistance programs found on the original site." /></Specimen>
          <Specimen name="Tags" file="src/components/site/Pages.tsx" note="Square tags for barangays, units and campuses."><Tags jobId={site.jobId} items={site.entities.filter((e) => e.type === "barangay").map((e) => ({ name: e.name, detail: e.detail, slug: e.slug }))} /></Specimen>
          <Specimen name="Markdown" file="src/components/site/Markdown.tsx" note="Migrated text with links rewritten into the preview. Headed tables are marked data-stack and turn into cards below 40rem.">
            <Markdown jobId={site.jobId} origin={site.origin} text={"## Office hours\n\nThe municipal hall is open **Monday to Friday**. See the [contact page](/contact).\n\n| Office | Room | Hours |\n|---|---|---|\n| Mayor's Office | 201 | 8:00–5:00 |\n| Treasurer | 105 | 8:00–4:00 |"} />
          </Specimen>
        </section>

        {/* Blocks */}
        <section id="blocks" className="pt-16 scroll-mt-20">
          <AppSectionHead n={n++} title="Content blocks" deck="Every page is a list of typed blocks (src/pipeline/schema.ts). Block renders each type." />
          {BLOCKS.map((b, i) => (
            <Specimen key={i} name={`Block · ${b.type}`} file="src/components/site/Blocks.tsx" note={b.note}>
              <div data-blocks><Block block={b.block} jobId={site.jobId} origin={site.origin} lang="en" /></div>
            </Specimen>
          ))}
        </section>

        {/* Civic */}
        <section id="civic" className="pt-16 scroll-mt-20">
          <AppSectionHead n={n++} title="Civic" deck="What RE:GOV adds to every rebuild from BetterGov.ph and open data." />
          <Specimen bleed name="CivicStrip" file="src/components/site/Civic.tsx" note={`Red tap-to-call grid under the masthead; LGUs also get Open-Meteo weather. ${real ? "Real data from the Marikina rebuild." : "Sample town (no weather)."}`}><CivicStrip site={real ?? site} /></Specimen>
          <Specimen name="HotlineTable" file="src/components/site/Civic.tsx" note="Hotline rows in a ruled grid, numbers in bold brand blue. Real national hotlines."><HotlineTable rows={NATIONAL_HOTLINES.slice(0, 6)} /></Specimen>
          <Specimen name="TransparencySection" file="src/components/site/Civic.tsx" note="Homepage section: pages the site publishes, national portals, and links for this kind of body."><TransparencySection site={site} n={0} /></Specimen>
          <Specimen name="ProjectList" file="src/components/site/Projects.tsx" note={`${COMMUNITY_NOTE} ${projects.length ? "Real WikiBayan rows matched to the Marikina rebuild." : ""}`}>
            {projects.length ? <ProjectList rows={projects} /> : <p className="text-sm text-neutral-600">WikiBayan returned no projects just now, so there is nothing to show.</p>}
          </Specimen>
          {real && projects.length > 0 && <Specimen name="ProjectsOnRecord" file="src/components/site/Projects.tsx" note="The compact version at the foot of the homepage's transparency section, linking to the full public-projects page. Renders nothing when WikiBayan has no match."><ProjectsOnRecord site={real} rows={projects} /></Specimen>}
        </section>

        {/* Whole pages */}
        <section id="pages" className="pt-16 scroll-mt-20">
          <AppSectionHead n={n++} title="Whole pages" deck="The templates assembled, from live previews." />
          {installed ? (
            <>
              <div className="mt-10 grid gap-8 lg:grid-cols-2">
                {[["HomePage", `/preview/${SAMPLE}?lang=en`, "src/components/site/Pages.tsx"], ["ContentPage", `/preview/${SAMPLE}/services/business-permit?lang=en`, "src/components/site/Pages.tsx"], ["HotlinesPage", `/preview/${SAMPLE}/hotlines?lang=en`, "src/components/site/Civic.tsx"], ...(real ? [["PublicProjectsPage", `/preview/${REAL}/${PROJECTS_SLUG}?lang=en`, "src/components/site/Projects.tsx"]] : []), ...(art ? [["AuroraHome + AuroraMenu (art-directed)", `/preview/${ART}?lang=en`, "src/components/site/Aurora.tsx · AuroraMenu.tsx"], ["AuroraPage + AuroraNav", `/preview/${ART}/faq?lang=en`, "src/components/site/Aurora.tsx"]] : [])].map(([name, src, file]) => (
                  <figure key={name}>
                    <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 border-b border-neutral-900 pb-2"><a href={src} className="font-semibold text-neutral-900 hover:text-kapwa-brand-900">{name} ↗</a><code className="text-[12px] text-neutral-500">{file}</code></figcaption>
                    <ScaledFrame src={src} title={name} className="mt-3 border border-neutral-300" />
                  </figure>
                ))}
              </div>
              <figure className="mt-12">
                <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 border-b border-neutral-900 pb-2"><span className="font-semibold text-neutral-900">MobileNav (phone, 390px)</span><code className="text-[12px] text-neutral-500">src/components/site/MobileNav.tsx</code></figcaption>
                <p className="mt-2 max-w-3xl text-[15px] text-neutral-600">Floating bottom bar: Home, the two top sections, More. Tap More for the drawer. This frame is live, so scroll and tap.</p>
                <iframe src={`/preview/${SAMPLE}?lang=en`} title="Sample site on a phone" className="mt-4 h-[780px] w-[390px] max-w-full border-8 border-neutral-900 bg-white" />
              </figure>
              <p className="mt-6 text-sm text-neutral-600">SearchPage is left out: every search asks Muse Spark for an answer, which spends model credits.</p>
            </>
          ) : (
            <p className="mt-6 text-[15px] text-neutral-600">Install the sample site to see whole pages here: <code>npm run sample</code>.</p>
          )}
        </section>

        {portal && maps && (
          <>
            <Part n="C" title="The Explore kit" deck="Tourism portals built from an LGU's own pages. Dark and photographic, with its own display face and liquid-glass navigation. Styles live in src/app/explore/explore.css inside @layer explore, which is how its rounded capsules beat the square-corner rule." />

            <section id="xp-foundations" className="pt-12 scroll-mt-20">
              <AppSectionHead n={n++} title="Foundations" deck="A night canvas, white hairlines, one warm accent." />
              <Specimen bleed name="Colour" file="src/app/explore/explore.css" note="Night #0b0c0e is the page; land a shade off it; white at set opacities draws every line. Gold marks the active pin; sea teal is for the coast map.">
                <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
                  {[["Night", "#0b0c0e", "Page"], ["Land", "#1b1d21", "Map land"], ["Ink", "#16181c", "Text on glass pills"], ["Sea", "#0e3a44", "Coast map, place dots"], ["Gold", "#ffd27a", "Active pin, pulse"], ["Paper", "#e8e6e1", "Prints, light panels"]].map(([name, hex, use]) => (
                    <li key={hex} className="border-r border-b border-neutral-200"><span className="block h-20" style={{ background: hex }} /><span className="block px-3 py-2 text-[13px]"><b className="font-semibold text-neutral-900">{name}</b> <span className="tabular-nums text-neutral-500">{hex}</span><span className="block text-neutral-600">{use}</span></span></li>
                  ))}
                </ul>
              </Specimen>
              <Specimen bleed name="Type" file=".xp-display · .ih-letter in explore.css" note="Barabara (public/fonts) for display lines, capitals only. The masthead's giant letters are Inter 700, each cut by its own grid cells. Body stays Inter.">
                <div className="xp grid gap-8 p-8 sm:p-12" style={{ minHeight: 0 }}>
                  <div className="xp-display text-6xl sm:text-8xl">{portal.title.join(" ")}</div>
                  <div className="font-bold tracking-[-0.04em] leading-none text-7xl sm:text-9xl">{portal.town}</div>
                  <p className="max-w-xl text-lg text-white/80">{portal.promise}.</p>
                </div>
              </Specimen>
              <Specimen bleed name="The ruled grid" file=".ih-rules in explore.css" note="The masthead is an 8 × 5 grid of white hairlines at 42% over one viewport of photograph (4 × 6 on phones). Letters and words are placed in its cells.">
                <div className="xp relative aspect-[16/7] overflow-hidden" style={{ minHeight: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={portal.hero.src} alt={portal.hero.alt} className="absolute inset-0 h-full w-full object-cover" />
                  <div aria-hidden className="absolute inset-0" style={{ backgroundImage: "linear-gradient(to right, rgb(255 255 255 / 0.42) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.42) 1px, transparent 1px)", backgroundSize: "12.5% 100%, 100% 20%" }} />
                  {portal.hero.kind !== "photo" && <span className="absolute bottom-3 right-4 text-[11px] text-white/80">{portal.hero.kind === "placeholder" ? "Placeholder made with Muse Image, not the actual place" : "Illustration made with Muse Image"}</span>}
                </div>
              </Specimen>
            </section>

            <section id="xp-components" className="pt-16 scroll-mt-20">
              <AppSectionHead n={n++} title="Components" deck="From src/components/explore. Most are scroll-driven and full-screen, so they are shown whole under Pages; these two stand alone." />
              <Specimen bleed name="LiquidGlass" file="src/components/explore/LiquidGlass.tsx" note="The capsule nav. Chromium bends the backdrop through an SVG displacement map drawn for the capsule's size; Safari and Firefox get frosted glass with a specular rim. The current section is a bright pill.">
                <div className="xp relative h-72 overflow-hidden [transform:translateZ(0)]" style={{ minHeight: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={portal.hero.src} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  <LiquidGlass as="nav" label="Sections (specimen)" className="xp-nav">
                    {["Home", "Story", "Places", "Events", "Plan"].map((l, i) => <a key={l} href="#xp-components" aria-current={i === 2 ? "location" : undefined}>{l}</a>)}
                  </LiquidGlass>
                </div>
              </Specimen>
              <Specimen bleed name="GeoSvg" file="src/components/explore/GeoSvg.tsx" note="Maps from open data: land a shade off the night, hairline roads and rivers, numbered white pins. A place is pinned only where the LGU's own map pins it; nothing is guessed.">
                <div className="xp grid gap-px sm:grid-cols-2" style={{ minHeight: 0, background: "rgb(255 255 255 / 0.1)" }}>
                  <div className="bg-[#0b0c0e] p-6 h-80"><GeoSvg map={maps.town} pins={portal.places.filter((pl) => pl.at).map((pl, i) => ({ lat: pl.at!.lat, lon: pl.at!.lon, n: i + 1, label: pl.name }))} label={`Places pinned on the LGU's map of ${portal.town}`} /></div>
                  <div className="bg-[#0b0c0e] p-6 h-80"><GeoSvg map={maps.province} pins={[{ lat: portal.center.lat, lon: portal.center.lon, label: portal.town }]} label={`${portal.town} on a map of ${portal.province}`} /></div>
                </div>
              </Specimen>
            </section>

            <section id="xp-more" className="pt-16 scroll-mt-20">
              <AppSectionHead n={n++} title="Sections and maps" deck="Pieces of the portal that also work on their own." />
              <Specimen bleed name="PlacesWhere" file="src/components/explore/Places.tsx" note="Where the town sits: kicker, outlined headline, lede, the province map with the town's point, two facts. In the portal it plays inside the Story's closing.">
                <div className="xp" style={{ minHeight: 0 }}><PlacesWhere portal={portal} maps={maps} /></div>
              </Specimen>
              <Specimen bleed name="CoastMap" file="src/components/explore/CoastMap.tsx" note="The town's coast to play with: numbered pins exactly where the LGU's own map puts them, a list to fly between them, drag to pan. Places the LGU's map does not pin are left off.">
                <div className="xp overflow-hidden" style={{ minHeight: 0, padding: "0 4vw" }}>
                  <CoastMap map={maps.town} label={`Map of ${portal.town}'s coast`} places={portal.places.map((pl, i) => ({ pl, i })).filter(({ pl }) => pl.at).map(({ pl, i }) => ({ n: i + 1, name: pl.name, kind: pl.kind, photo: pl.photo?.src, href: `/explore/${xpSlug}/places/${pl.slug}`, lat: pl.at!.lat, lon: pl.at!.lon }))} />
                </div>
              </Specimen>
              <Specimen bleed name="EventStatus" file="src/components/explore/EventStatus.tsx" note="Past or still to come, worked out by month in the reader's browser, so a built page never goes stale. Empty during server rendering.">
                <ul className="xp px-6 py-2" style={{ minHeight: 0 }}>
                  {portal.events.slice(0, 5).map((e) => <li key={e.slug} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-white/15 py-3 last:border-0"><span className="font-semibold">{e.name} <span className="font-normal text-white/60">· {e.dates}{e.year ? ` (${e.year} dates)` : ""}</span></span><EventStatus event={e} className="text-sm text-[#ffd27a]" /></li>)}
                </ul>
              </Specimen>
            </section>

            <section id="xp-pages" className="pt-16 scroll-mt-20">
              <AppSectionHead n={n++} title="Pages" deck="Portal: Hero, Story, Places, Events, Plan, Footer, under the SiteNav capsule. Then a page per place and per event. Every fact keeps its source; AI images are labelled." />
              <div className="mt-10 grid gap-8 lg:grid-cols-2">
                <Frame name={`Explore ${portal.town}`} src={`/explore/${xpSlug}`} file="src/app/explore/[slug]/page.tsx" />
                {portal.places[0] && <Frame name={`Place: ${portal.places[0].name}`} src={`/explore/${xpSlug}/places/${portal.places[0].slug}`} file="src/components/explore/PlaceView.tsx" />}
                {portal.events[0] && <Frame name={`Event: ${portal.events[0].name}`} src={`/explore/${xpSlug}/events/${portal.events[0].slug}`} file="src/components/explore/EventView.tsx" />}
              </div>
              <figure className="mt-12">
                <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 border-b border-neutral-900 pb-2"><span className="font-semibold text-neutral-900">The portal on a phone (390px)</span><code className="text-[12px] text-neutral-500">Story.tsx · Places.tsx · Events.tsx · Plan.tsx</code></figcaption>
                <p className="mt-2 max-w-3xl text-[15px] text-neutral-600">Live: scroll inside the frame to see the story close into a print, the maps settle and the capsule track each section.</p>
                <iframe src={`/explore/${xpSlug}`} title={`Explore ${portal.town} on a phone`} className="mt-4 h-[780px] w-[390px] max-w-full border-8 border-neutral-900 bg-black" />
              </figure>
            </section>
          </>
        )}
      </main>
      <AppFooter />
    </>
  );
}
