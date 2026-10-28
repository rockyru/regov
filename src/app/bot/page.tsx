import { LegalPage } from "@/components/LegalPage";
import { BOT, UA } from "@/pipeline/robots";

export const metadata = { title: "REGOVBot | RE:GOV", description: "What the RE:GOV crawler fetches, how it follows robots.txt and a site's terms of use, and how to block it or ask for a takedown." };

const Code = ({ children }: { children: string }) => <pre className="overflow-x-auto whitespace-pre-wrap border border-neutral-300 bg-neutral-50 p-4 font-mono text-[13px] leading-relaxed text-neutral-900">{children}</pre>;

export default function Bot() {
  return (
    <LegalPage
      kicker={BOT}
      title="About the RE:GOV crawler"
      deck="REGOVBot visits a government website only when someone asks RE:GOV to reimagine it. Here is exactly what it fetches, the rules it follows, and how a site can block it or ask for a takedown."
      updated="October 28, 2026"
      sections={[
        { title: "Who it is", body: <>
          <p>REGOVBot is the crawler of RE:GOV, an independent, non-commercial civic-tech project. It identifies itself in every request with this user agent:</p>
          <Code>{UA}</Code>
          <p>It runs only when a person submits a government address on regov.app. It does not crawl the web on its own, and it does not index sites for search or train models.</p>
        </> },
        { title: "What it fetches", body: <ul>
          <li>Public pages of the one site requested: up to 30 pages, at most three links deep, about one request a second.</li>
          <li>Citizen&rsquo;s Charter PDFs linked from those pages, and the WordPress REST API when the site exposes it.</li>
          <li>No logins, no forms, no search boxes. It never solves a captcha or works around bot protection; when it meets one, it stops.</li>
          <li>RE:GOV accepts at most 7 new sites a day in total, and does not crawl the same site twice within 24 hours.</li>
        </ul> },
        { title: "robots.txt", body: <>
          <p>REGOVBot follows robots.txt as set out in RFC 9309: rules for REGOVBot if the file names it, otherwise the rules for every crawler (<code>*</code>), with Allow and Disallow, wildcards, and Crawl-delay (up to 30 seconds). If robots.txt cannot be read because the server errors, it stays out.</p>
          <p>If robots.txt asks REGOVBot, or every crawler, to stay away from the whole site, RE:GOV does not rebuild that site at all, not even from the Wayback Machine. To block only REGOVBot:</p>
          <Code>{`User-agent: ${BOT}\nDisallow: /`}</Code>
        </> },
        { title: "Terms of use", body: <>
          <p>Before it collects any page, REGOVBot opens the site&rsquo;s terms of use, legal notice or disclaimer linked from the homepage, and Muse Spark reads it. If the terms forbid automated access (crawling, scraping, data mining) or republishing the content without permission, the run stops there and the person who asked sees the clause that applies.</p>
          <p>A plain &ldquo;all rights reserved&rdquo; line, or a request to credit the source, does not stop a run: RE:GOV links every rebuilt page to its original. Works of the Philippine government carry no copyright (Republic Act 8293, section 176), but a site&rsquo;s own terms are still followed.</p>
        </> },
        { title: "Sites that are down or block bots", body: <p>When a site is down or behind bot protection, RE:GOV rebuilds it from the Internet Archive&rsquo;s public Wayback Machine captures instead, under the robots.txt and terms of use that the archive captured for that site.</p> },
        { title: "Block it or take a concept down", body: <>
          <p>Any site owner can ask RE:GOV to stop, and sites found to forbid it in their terms are added too. The domain goes on a do-not-crawl list: new requests for it are refused, and existing concepts, screenshots and reports of it stop being served. Requests are honoured promptly.</p>
          <p>Open an issue at <a href="https://github.com/rockyru/regov/issues">github.com/rockyru/regov/issues</a> or contact the maintainer via <a href="https://rmbergonia.com">rmbergonia.com</a>. The crawler&rsquo;s code is open at <a href="https://github.com/rockyru/regov/blob/main/src/pipeline/crawl.ts">src/pipeline/crawl.ts</a>.</p>
        </> },
      ]}
    />
  );
}
