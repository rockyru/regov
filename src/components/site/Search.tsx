import { Suspense } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import type { SiteModel } from "@/pipeline/schema";
import { searchSite } from "@/lib/siteSearch";
import { askSite, AskLimitError, normalizeQuestion } from "@/pipeline/ask";
import { Markdown } from "./Markdown";
import { navHref, eyebrow } from "./Shell";
import { t } from "./i18n";

const searchHref = (jobId: string, q: string) => `${navHref(jobId, "search")}?q=${encodeURIComponent(q)}`;

/** Search results for the header box, with a Muse Spark answer drawn only from this site's pages. */
export function SearchPage({ site, q: raw }: { site: SiteModel; q: string }) {
  const { jobId, lang } = site;
  const q = normalizeQuestion(raw);
  const hits = q ? searchSite(site, q) : [];
  const suggestions = site.popular_services.slice(0, 5).map((s) => s.title);
  return (
    <>
      <div className="border-b-2 border-neutral-900 bg-white">
        <div className="container-gov py-10 lg:py-14">
          <nav aria-label="Breadcrumb" className={`${eyebrow} text-neutral-500 flex gap-2`}><Link href={navHref(jobId, "home")} className="hover:text-kapwa-brand-900">{t(lang, "Home")}</Link><span aria-hidden>/</span><span className="text-neutral-900">{t(lang, "Search")}</span></nav>
          <h1 className="mt-6 text-4xl sm:text-5xl font-extrabold tracking-[-0.02em] leading-[1.0] text-neutral-900">{t(lang, "Search or ask")}</h1>
          <form role="search" action={navHref(jobId, "search")} className="mt-6 flex max-w-3xl">
            <label className="sr-only" htmlFor="ask-q">{t(lang, "Your question or search words")}</label>
            <input id="ask-q" name="q" defaultValue={q} maxLength={200} placeholder={t(lang, "e.g. How do I get a business permit?")} className="h-14 min-w-0 flex-1 border-2 border-r-0 border-neutral-900 bg-white px-4 text-lg placeholder:text-neutral-500 focus:outline-none focus:bg-kapwa-yellow-50" />
            <button type="submit" className="h-14 shrink-0 bg-kapwa-brand-900 px-6 font-bold text-white hover:bg-kapwa-brand-950">{t(lang, "Ask")}</button>
          </form>
        </div>
      </div>
      <div className="container-gov py-12 grid gap-12 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-12">
          {q && <Suspense fallback={<AnswerShell lang={lang}><p className="flex items-center gap-3 text-neutral-600" role="status"><span aria-hidden className="size-4 shrink-0 rounded-full border-2 border-neutral-300 border-t-kapwa-brand-900 motion-safe:animate-spin" />{t(lang, "Muse Spark is reading this site's pages…")}</p></AnswerShell>}><Answer site={site} q={q} /></Suspense>}
          {q && (
            <section>
              <h2 className={`${eyebrow} text-neutral-500 border-b border-neutral-900 pb-2`}>{t(lang, "Matching pages")} <span className="tabular-nums">{hits.length}</span></h2>
              {hits.length ? (
                <ol className="divide-y divide-neutral-200">
                  {hits.map((h) => (
                    <li key={h.page.slug} className="py-4">
                      <Link href={navHref(jobId, h.page.slug)} className="text-lg font-semibold text-neutral-900 hover:text-kapwa-brand-900">{h.page.title}</Link>
                      {h.page.section && <span className={`ml-3 ${eyebrow} text-kapwa-brand-700`}>{h.page.section}</span>}
                      <p className="mt-1 text-[15px] leading-relaxed text-neutral-600 line-clamp-2">{h.snippet}</p>
                    </li>
                  ))}
                </ol>
              ) : <p className="py-4 text-neutral-600">{t(lang, "No page uses those words. Try fewer or simpler words, or ask a full question above.")}</p>}
            </section>
          )}
        </div>
        <aside className="self-start lg:sticky lg:top-24">
          <h2 className={`${eyebrow} text-neutral-500 border-b border-neutral-900 pb-2`}>{t(lang, "People also look for")}</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {suggestions.map((s) => <li key={s}><Link prefetch={false} href={searchHref(jobId, s)} className="inline-block border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-800 hover:border-neutral-900">{s}</Link></li>)}
          </ul>
        </aside>
      </div>
    </>
  );
}

function AnswerShell({ lang, children }: { lang: SiteModel["lang"]; children: React.ReactNode }) {
  return (
    <section aria-labelledby="answer-h" className="border-l-4 border-kapwa-brand-900 bg-kapwa-brand-50 p-6">
      <h2 id="answer-h" className={`${eyebrow} text-kapwa-brand-900`}>{t(lang, "Answer from this site's pages")} <span className="font-semibold normal-case tracking-normal text-neutral-600">· Muse Spark</span></h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

async function Answer({ site, q }: { site: SiteModel; q: string }) {
  const h = await headers();
  const ip = h.get("cf-connecting-ip") || h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const res = await askSite(site, q, ip).catch((e: Error) => (e instanceof AskLimitError ? e.reason : "failed" as const));
  const { lang, jobId } = site;
  if (typeof res === "string") {
    const msg = res === "visitor" ? "You have asked a lot of questions in the last few minutes. Please wait a little, or use the matching pages below." : res === "daily" ? "The assistant has answered as many questions as it can today. The matching pages below still work." : "The assistant could not answer just now. The matching pages below still work.";
    return <AnswerShell lang={lang}><p className="text-neutral-700">{t(lang, msg)}</p></AnswerShell>;
  }
  const title = (slug: string) => site.pages.find((p) => p.slug === slug)?.title ?? (slug === "hotlines" ? t(lang, "Emergency hotlines") : slug);
  return (
    <AnswerShell lang={lang}>
      <div className="prose-gov text-[17px] text-neutral-900"><Markdown text={res.answer_markdown} jobId={jobId} origin={site.origin} /></div>
      {res.sources.length > 0 && (
        <div className="mt-4">
          <div className={`${eyebrow} text-neutral-600`}>{t(lang, "Sources")}</div>
          <ul className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1">{res.sources.map((s) => <li key={s}><Link href={navHref(jobId, s)} className="font-semibold text-kapwa-brand-800 underline decoration-kapwa-brand-300 underline-offset-4 hover:decoration-kapwa-brand-800">{title(s)}</Link></li>)}</ul>
        </div>
      )}
      <p className="mt-4 text-[13px] text-neutral-600">{t(lang, "AI-generated from the pages of this unofficial concept site. It can be wrong: check the source page and the agency's official website before you act.")}</p>
    </AnswerShell>
  );
}
