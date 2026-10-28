import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";

export const metadata = { title: "Terms of use" };

export default function Terms() {
  return (
    <LegalPage kicker="Terms" title="Terms of use" deck="Short version: RE:GOV makes unofficial, AI-generated concepts of public websites for demonstration. Use it in that spirit, and never as a source of official information." updated="28 October 2026" sections={[
      { title: "What RE:GOV is", body: <>
        <p>RE:GOV is an independent, open-source experiment built for the Meta Global AI Developer Hackathon 2026. It is operated by an individual developer, not by any government body, and it is not a government service.</p>
        <p>Everything it produces is an <strong>unofficial concept</strong>. Rebuilt sites are not operated by, endorsed by or affiliated with the agencies whose public pages they are based on.</p>
      </> },
      { title: "Acceptable use", body: <>
        <ul>
          <li>Submit only public websites of government agencies, local government units, state universities, public hospitals and similar public institutions. The form rejects other domains.</li>
          <li>Do not use RE:GOV to overload a website. The crawler (<Link href="/bot">REGOVBot</Link>) is rate-limited, follows robots.txt and stops when a site&rsquo;s terms of use forbid automated access or republishing; do not try to circumvent that.</li>
          <li>Do not present a reimagined concept as an official website, remove its disclaimers, or use it to collect information from the public.</li>
          <li>Do not abuse the service with automated or bulk submissions.</li>
        </ul>
      </> },
      { title: "Accuracy and no reliance", body: <>
        <p>Content is migrated automatically and may be incomplete, outdated or wrong. Illustrations are AI-generated. Hotline numbers, office hours, fees, names and requirements must be verified with the official source before you rely on them. For any transaction or official information, use the agency&rsquo;s official website.</p>
      </> },
      { title: "Content and ownership", body: <>
        <p>Text, documents and images on rebuilt pages belong to the originating agencies and remain subject to Philippine law on government works and any third-party rights they carry. RE:GOV claims no ownership over them and reproduces them only to demonstrate a redesign, with a link back to every original page.</p>
        <p>The RE:GOV software is open source at <a href="https://github.com/rockyru/regov">github.com/rockyru/regov</a>. The BetterGov.ph Kapwa design system and its hotline data are used under their own licences.</p>
      </> },
      { title: "Requests from agencies", body: <p>Any agency may ask for a concept of its site to be corrected, relabelled or taken down, or for its domain to be excluded from RE:GOV entirely (see <Link href="/bot">About the crawler</Link>). Requests are honoured promptly. Open an issue at <a href="https://github.com/rockyru/regov/issues">github.com/rockyru/regov/issues</a> or contact the maintainer via <a href="https://rmbergonia.com">rmbergonia.com</a>.</p> },
      { title: "Availability", body: <p>RE:GOV is a demonstration and may be slow, rate-limited, paused or discontinued at any time without notice. Runs may fail or be lost; nothing here is a commitment of service.</p> },
      { title: "No warranty and limitation of liability", body: <p>RE:GOV is provided &ldquo;as is&rdquo;, without warranties of any kind. To the fullest extent permitted by law, the maintainer is not liable for any loss or damage arising from use of RE:GOV or reliance on anything it produces.</p> },
      { title: "Governing law", body: <p>These terms are governed by the laws of the Republic of the Philippines.</p> },
    ]} />
  );
}
