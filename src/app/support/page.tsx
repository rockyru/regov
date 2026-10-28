import { notFound } from "next/navigation";
import { LegalPage } from "@/components/LegalPage";
import { sponsorUrl } from "@/lib/sponsor";

export const metadata = { title: "Support", description: "RE:GOV is free and open source. Sponsoring the project on GitHub helps cover the model usage, crawling and hosting that every reimagined site costs." };

export default function Support() {
  const url = sponsorUrl();
  if (!url) notFound();
  return (
    <LegalPage
      kicker="Support the project"
      title="Help keep RE:GOV running"
      deck="RE:GOV is free, open source and built by one person in Manila. Every site it reimagines costs real money in model usage and hosting. If it is useful to you, you can sponsor its development on GitHub."
      updated="28 October 2026"
      sections={[
        { title: "Sponsor on GitHub", body: <>
          <p>Sponsorship goes through GitHub Sponsors, monthly or once. GitHub handles the payment; RE:GOV never sees your card details.</p>
          <p><a href={url} className="!no-underline inline-flex h-11 items-center gap-2 bg-kapwa-brand-900 px-5 font-semibold text-white hover:bg-kapwa-brand-950">Sponsor RE:GOV on GitHub ↗</a></p>
        </> },
        { title: "What it pays for", body: <ul>
          <li><strong>Model usage.</strong> Each run sends a site&rsquo;s pages and screenshots to Meta&rsquo;s models (Muse Spark, SAM 3.1, Muse Image) to read, segment, rebuild and illustrate it. This is the largest cost, and the reason for the daily limit on new sites.</li>
          <li><strong>Crawling and hosting.</strong> The server that runs the crawler and serves every concept, storage for job files, and the domain.</li>
          <li><strong>Development.</strong> Time spent on new features, accessibility fixes and agency requests.</li>
        </ul> },
        { title: "What it does not buy", body: <>
          <p>Everything on RE:GOV stays free for everyone, sponsor or not. Sponsorship does not buy more runs, faster runs, a place in the queue, or any say over which sites are rebuilt or what a concept says.</p>
          <p>RE:GOV has no advertising and no paid features, and remains a non-commercial project.</p>
        </> },
        { title: "Independent and unofficial", body: <p>Sponsorship supports the developer of an independent open-source project. It is not a donation to, or on behalf of, any government agency, local government unit or public body, none of which operate, endorse or receive money from RE:GOV. Contributions are voluntary and are not tax-deductible.</p> },
        { title: "Other ways to help", body: <ul>
          <li>Send feedback with the Feedback button, or report a problem in a concept.</li>
          <li>Contribute code, fixes or documentation at <a href="https://github.com/rockyru/regov">github.com/rockyru/regov</a>.</li>
          <li>Share a concept with someone who works on a public website.</li>
        </ul> },
      ]}
    />
  );
}
