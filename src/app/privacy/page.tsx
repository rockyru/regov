import { LegalPage } from "@/components/LegalPage";

export const metadata = { title: "Privacy" };

export default function Privacy() {
  return (
    <LegalPage kicker="Privacy" title="Privacy notice" deck="RE:GOV is a solo, open-source civic-tech experiment. It has no accounts, no advertising and no tracking. This page explains what it does handle." updated="28 October 2026" sections={[
      { title: "What RE:GOV collects", body: <>
        <p>RE:GOV has no sign-up and sets no cookies of its own. It does not run analytics or advertising scripts.</p>
        <ul>
          <li><strong>The website address you submit.</strong> It is kept as part of the job record so the result can be shown and linked.</li>
          <li><strong>Public content of that website.</strong> The agent downloads pages, images and screenshots from the site you name, or from its Wayback Machine capture, and stores them with the job. This is the agency&rsquo;s public content, not yours.</li>
          <li><strong>Comments you send.</strong> The feedback box stores your message, the RE:GOV page you sent it from and, only if you give one, your email address so we can reply. It is emailed to the maintainer through Cloudflare and kept on the server. Your IP address is not stored with it.</li>
          <li><strong>Standard server logs.</strong> RE:GOV runs on a virtual server, with Cloudflare in front of it as a content delivery network. Both record request metadata such as IP address, user agent and time for security and operations; Cloudflare does so under <a href="https://www.cloudflare.com/privacypolicy/">Cloudflare&rsquo;s privacy policy</a>. Generated sites are backed up to Cloudflare R2 storage.</li>
        </ul>
        <p>Apart from an email address you choose to leave with a comment, nothing you type is tied to you as a person. Job records are public: anyone with the link can see which site was reimagined and when.</p>
      </> },
      { title: "Who else processes data", body: <>
        <ul>
          <li><strong>Meta Model API.</strong> Page text, screenshots and images from the crawled site are sent to Meta&rsquo;s models (Muse Spark, SAM 3.1, Muse Image) to be read, segmented and illustrated. Meta processes them under its own terms.</li>
          <li><strong>Internet Archive.</strong> When a site blocks crawlers, RE:GOV requests its public captures from the Wayback Machine.</li>
          <li><strong>Open-Meteo.</strong> For local governments, a forecast is requested by place name only.</li>
          <li><strong>Cloudflare.</strong> Hosting, storage of job files, the domain, and delivery of comments by email (Cloudflare Email Service). The feedback and Reimagine forms use Cloudflare Turnstile to check that a person, not a script, is sending them; Turnstile looks at signals from your browser under <a href="https://www.cloudflare.com/turnstile-privacy-policy/">its own privacy terms</a> and sets no tracking cookies.</li>
        </ul>
        <p>No data is sold, shared for advertising, or used to train models by RE:GOV.</p>
      </> },
      { title: "How long it is kept", body: <>
        <p>Job files stay in storage so finished concepts remain viewable. They can be deleted at any time on request. Comments are kept until they have been dealt with, and deleted on request. Server logs are retained by Cloudflare for its standard period.</p>
      </> },
      { title: "Your choices and requests", body: <>
        <p>If you represent an agency and want a reimagined concept of your site changed, labelled differently or removed, or if you believe personal data appears in a job that should not, open an issue at <a href="https://github.com/rockyru/regov/issues">github.com/rockyru/regov/issues</a> write to <a href="mailto:hello@regov.app">hello@regov.app</a>, or use the Feedback button on any page. Removal requests from agencies are honoured without argument.</p>
      </> },
      { title: "Children", body: <p>RE:GOV is a developer tool for public websites and is not directed at children. It does not knowingly collect information from anyone.</p> },
      { title: "Changes", body: <p>This notice may change as the project evolves. The date above reflects the latest revision. Material changes will be noted in the project repository.</p> },
    ]} />
  );
}
