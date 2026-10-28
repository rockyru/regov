import type { Tally, UsageFile } from "./usage";

export const STEP_LABEL: Record<string, string> = {
  understand: "Understand pages", plan: "Plan the site", segment: "Find the seal", regions: "Text in images", design: "Design check", band: "Header artwork",
  build: "Build (other)", build_early: "Build (before per-step records)", verify: "Self-check", charter: "Citizen's Charter", portraits: "Portraits", evidence: "Evidence",
  translate: "Filipino version", ask: "Ask this site",
};
/** USD per million Muse Spark tokens for estimates. Default from the early measured average (about $0.38 for a 170k-token site, SAM and Muse Image included). */
export const usdPerMTok = () => Number(process.env.USD_PER_MTOK) || 0.38 / 0.17;
export const usd = (tokens: number) => `$${((tokens / 1e6) * usdPerMTok()).toFixed(tokens < 200_000 ? 3 : 2)}`;
export const sum = (t: Tally) => Object.values(t).reduce((a, v) => ({ calls: a.calls + v.calls, tokens: a.tokens + v.tokens }), { calls: 0, tokens: 0 });
export const totalOf = (u: UsageFile) => { const r = sum(u.run), o = sum(u.on_demand); return { calls: r.calls + o.calls, tokens: r.tokens + o.tokens, run: r, on_demand: o }; };
