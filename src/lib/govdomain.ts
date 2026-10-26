/** Only government bodies: PH first, plus the common government TLD patterns elsewhere. */
const PATTERNS: RegExp[] = [
  /\.gov\.ph$/, /\.edu\.ph$/, /\.mil\.ph$/,            // Philippines: agencies, state universities and schools, AFP
  /\.gov$/, /\.mil$/,                                   // US-style
  /\.gov\.[a-z]{2}$/, /\.gob\.[a-z]{2}$/, /\.go\.[a-z]{2}$/, /\.gouv\.[a-z]{2}$/, /\.gc\.ca$/, /\.govt\.nz$/, /\.gv\.at$/, /\.admin\.ch$/,
  /\.ac\.[a-z]{2}$/, /\.edu\.[a-z]{2}$/,               // public universities abroad
];
const ALLOW = new Set(["bettergov.ph", "gov.ph", "officialgazette.gov.ph"]);

export function isGovernmentHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^www\./, "");
  if (ALLOW.has(h)) return true;
  return PATTERNS.some((re) => re.test(h));
}

export function normalizeSiteUrl(raw: string): URL | null {
  let v = raw.trim();
  if (!v) return null;
  if (!/^https?:\/\//i.test(v)) v = "https://" + v;
  try { const u = new URL(v); if (!u.hostname.includes(".")) return null; return u; } catch { return null; }
}
