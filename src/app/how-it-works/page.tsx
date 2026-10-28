import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";

export const metadata = { title: "How it works | RE:GOV", description: "What the RE:GOV agent does with a government website, step by step, which Meta model does what, and where it stops." };

const M = ({ children }: { children: React.ReactNode }) => <span className="whitespace-nowrap font-semibold text-kapwa-brand-900">{children}</span>;

export default function HowItWorks() {
  return (
    <LegalPage
      kicker="How it works"
      title="From an old address to a new site"
      deck="What the agent does with a government website, step by step: which Meta model does what, how it checks itself, and where a person has to take over."
      updated="October 28, 2026"
      sections={[
        { title: "You paste an address", body: <>
          <p>RE:GOV takes government and public-school addresses only: .gov.ph, .edu.ph and .mil.ph, plus government domains abroad. Runs wait in a queue and a few go at a time, so each gets the whole machine. The job page shows your place in line and keeps itself up to date.</p>
          <p>The same site is not rebuilt twice within a day; you are sent to the run that already exists. Model credits are limited, so there is a daily cap on new runs.</p>
        </> },
        { title: "Crawl", body: <>
          <p>A real browser (Playwright) visits up to 30 pages on the same site at about one request a second, following robots.txt and Crawl-delay. Before any page is collected, Muse Spark reads the site&rsquo;s terms of use; if they forbid automated access or republishing, the run stops. <Link href="/bot">More about the crawler</Link>. For each page it keeps a full screenshot, the visible text, the links and any attached files. WordPress sites also give up their posts through the REST API.</p>
          <p>If the site blocks crawlers or is down, the agent rebuilds from the <a href="https://web.archive.org">Wayback Machine</a> month with the most real pages, so even a dead site gets its content back.</p>
        </> },
        { title: "Understand", body: <>
          <p><M>Muse Spark 1.3</M> reads every page, screenshot and text together, and returns a strict, typed model of it: headings, people, steps, tables, contacts, FAQs, timelines. Text that only exists inside an image (a scanned notice, a poster) is transcribed. It also notes accessibility problems and anything a person should confirm.</p>
        </> },
        { title: "Plan", body: <>
          <p><M>Muse Spark</M> then looks at all the pages at once and plans a citizen-first site: the navigation, the services people come for, the homepage sections, the footer, and a redirect from every old address to its new one.</p>
        </> },
        { title: "Seal and header art", body: <>
          <p><M>SAM 3.1</M> finds the agency&rsquo;s seal on the old homepage and cuts it out cleanly to use as the new logo. <M>Muse Spark</M> writes an art brief from the plan, and <M>Muse Image</M> paints a wide header illustration for that agency or town. It is labelled as AI-generated, never passed off as a photograph.</p>
        </> },
        { title: "Build on Kapwa", body: <>
          <p>The site is rendered live from the plan on <a href="https://github.com/bettergovph/kapwa">Kapwa</a>, the design system BetterGov.ph volunteers made for Philippine government portals: its colour tokens, type scale and base styles, with an editorial layout on top (square corners, ruled sections, numbered indexes) so it reads like a public document, not an app. <Link href="/case-study">How RE:GOV uses Kapwa →</Link></p>
          <p>A design check runs first. If the old site is already modern, the agent keeps its brand colour and softer shapes and upgrades it instead of replacing its look.</p>
        </> },
        { title: "Documents and people", body: <>
          <p>Every office must publish a Citizen&rsquo;s Charter: requirements, steps, fees and processing time for each service. Agencies usually post it as a PDF. <M>Muse Spark</M> reads those PDFs directly and turns each service into its own page with a requirements list and a step table, linked to the source file.</p>
          <p><M>SAM 3.1</M> finds officials&rsquo; portraits on the old pages, and <M>Muse Spark</M> names each one from the caption beside it, never from the face, and writes its alt text.</p>
        </> },
        { title: "Checks", body: <>
          <ul>
            <li><strong>Self-check.</strong> <M>Muse Spark</M> reads each rebuilt page next to its original and lists what was lost and any statement the original does not support.</li>
            <li><strong>Evidence.</strong> <M>SAM 3.1</M> outlines the visible accessibility problems on the old homepage, so the report shows them, not just lists them.</li>
            <li><strong>WCAG 2.2 AA.</strong> Every rebuilt page is tested with axe-core, and each finding is tagged with the criterion it breaks.</li>
            <li><strong>Before and after.</strong> Both homepages are loaded in a fresh browser to compare speed, weight, requests and automated accessibility errors.</li>
          </ul>
          <p>All of it lands in the migration report for each site, linked from the <Link href="/showcase">showcase</Link>.</p>
        </> },
        { title: "After the build", body: <>
          <ul>
            <li><strong>Filipino edition.</strong> The language switch asks <M>Muse Spark</M> to translate a page the first time someone reads it in Filipino.</li>
            <li><strong>Ask this site.</strong> The search box answers questions using only the site&rsquo;s own pages, and cites them.</li>
            <li><strong>Handoff.</strong> The agency can download the whole site as static HTML with a redirect map and a README, to publish on its own server.</li>
          </ul>
        </> },
        { title: "Where it stops", body: <>
          <p>Every site RE:GOV makes is an <strong>unofficial concept</strong>. It is marked that way on every page, kept out of search engines, and not affiliated with the agency. The agent does not log in anywhere, fill in forms or touch the original site.</p>
          <p>Models make mistakes, and the self-check catches most, not all. Fees, hotlines and office hours should be confirmed with the office, and a person with a keyboard and a screen reader still needs to test the result. Agencies can ask for changes or removal through <a href="https://github.com/rockyru/regov/issues">GitHub issues</a>. The code is open at <a href="https://github.com/rockyru/regov">github.com/rockyru/regov</a>.</p>
        </> },
      ]}
    />
  );
}
