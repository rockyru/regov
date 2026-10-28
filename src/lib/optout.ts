/**
 * Domains RE:GOV does not crawl or rebuild (see /bot): owners who asked, and sites whose terms of use
 * forbid it. A listed domain is refused at submission and its existing concepts stop being served.
 * Subdomains are included.
 * OPT_OUT_DOMAINS (comma-separated) adds entries without a code change.
 */
export const OPT_OUT: string[] = [
  "pna.gov.ph", // terms of use forbid republishing without permission (checked Oct 28, 2026)
];

const all = () => [...OPT_OUT, ...(process.env.OPT_OUT_DOMAINS ?? "").split(",")].map((d) => d.trim().toLowerCase().replace(/^www\./, "")).filter(Boolean);

export function optedOut(hostOrUrl: string): boolean {
  let host = hostOrUrl.toLowerCase();
  try { host = new URL(hostOrUrl).hostname.toLowerCase(); } catch { /* already a host */ }
  host = host.replace(/^www\./, "");
  return all().some((d) => host === d || host.endsWith(`.${d}`));
}
