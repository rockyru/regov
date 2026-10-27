import { Suspense } from "react";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { join } from "node:path";
import { loadSite, findPage, JOBS_ROOT } from "@/lib/jobs";
import { GovStrip, Header, Footer, PreviewBar } from "@/components/site/Shell";
import { HomePage, ContentPage } from "@/components/site/Pages";
import { HotlinesPage } from "@/components/site/Civic";
import { brandScale } from "@/components/site/theme";
import { PublicProjectsPage, PROJECTS_SLUG } from "@/components/site/Projects";
import { projectsFor } from "@/lib/wikibayan";
import { translatePage, translateSite, TranslateBudgetError } from "@/pipeline/translate";
import type { SiteModel, SitePage } from "@/pipeline/schema";
import type { Lang } from "@/components/site/i18n";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ jobId: string; slug?: string[] }>; searchParams: Promise<{ lang?: string }> };

export default async function Preview({ params, searchParams }: Props) {
  const { jobId, slug = [] } = await params;
  const site = await loadSite(jobId);
  if (!site) notFound();
  const path = slug.join("/");
  const virtual = path === "hotlines" || path === PROJECTS_SLUG;
  const page = virtual ? undefined : findPage(site, path);
  if (!page && !virtual) notFound();
  // ?lang= for a shared link, else the visitor's choice from the switch in the top strip.
  const q = (await searchParams).lang;
  const lang: Lang = (q === "fil" || q === "en" ? q : (await cookies()).get("regov_lang")?.value) === "fil" ? "fil" : "en";
  const here = `/preview/${jobId}${path ? `/${path}` : ""}`;
  if (lang === "en") return <SiteView site={site} page={page} path={path} here={here} />;
  // The English page shows at once with a notice; the Filipino one streams in over it when ready.
  return (
    <Suspense fallback={<SiteView site={site} page={page} path={path} here={here} notice="translating" />}>
      <FilipinoView site={site} page={page} path={path} here={here} />
    </Suspense>
  );
}

async function FilipinoView({ site, page, path, here }: { site: SiteModel; page?: SitePage; path: string; here: string }) {
  const dir = join(JOBS_ROOT, site.jobId);
  const done = await Promise.all([translateSite(dir, site), page ? translatePage(dir, page) : undefined]).catch((e: Error) => {
    console.warn("[fil]", site.jobId, path, e.message);
    return e instanceof TranslateBudgetError ? "budget" as const : "failed" as const;
  });
  if (typeof done === "string") return <SiteView site={site} page={page} path={path} here={here} notice={done} />;
  return <SiteView site={{ ...done[0], lang: "fil" }} page={done[1]} path={path} here={here} />;
}

const NOTICE = {
  translating: "Isinasalin sa Filipino ng Muse Spark… Lalabas ang salin dito sa ilang segundo.",
  budget: "Naubos na ang pagsasalin para sa araw na ito. Ipinapakita ang Ingles na bersiyon; subukan muli bukas.",
  failed: "Hindi naisalin ang pahinang ito ngayon. Ipinapakita ang Ingles na bersiyon; subukan muli mamaya.",
};

async function SiteView({ site, page, path, here, notice }: { site: SiteModel; page?: SitePage; path: string; here: string; notice?: keyof typeof NOTICE }) {
  return (
    <div lang={site.lang === "fil" ? "fil" : undefined} className="editorial site-shell flex flex-1 flex-col" style={site.design?.mode === "refine" ? brandScale(site.design.primary) : undefined}>
      <PreviewBar site={site} currentSource={page?.source_url} />
      <GovStrip jobId={site.jobId} lang={site.lang ?? (notice ? "fil" : "en")} here={here} />
      {notice && (
        <div role="status" lang="fil" className="bg-kapwa-yellow-50 border-b border-kapwa-yellow-400 text-[14px] text-neutral-800">
          <div className="container-gov py-2.5 flex items-center gap-3">
            {notice === "translating" && <span aria-hidden className="size-3.5 shrink-0 rounded-full border-2 border-neutral-400 border-t-kapwa-brand-900 motion-safe:animate-spin" />}
            {NOTICE[notice]}
          </div>
        </div>
      )}
      <Header site={site} />
      <main className="flex-1">{path === PROJECTS_SLUG ? <PublicProjectsPage site={site} rows={await projectsFor(site)} /> : !page ? <HotlinesPage site={site} /> : page.slug === "home" ? <HomePage site={site} page={page} /> : <ContentPage site={site} page={page} />}</main>
      <Footer site={site} />
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ jobId: string; slug?: string[] }> }) {
  const { jobId, slug = [] } = await params;
  const site = await loadSite(jobId);
  const path = slug.join("/");
  if (site && path === "hotlines") return { title: `Emergency hotlines | ${site.agency.short_name} (unofficial RE:GOV concept)`, robots: { index: false, follow: false } };
  if (site && path === PROJECTS_SLUG) return { title: `Public projects | ${site.agency.short_name} (unofficial RE:GOV concept)`, robots: { index: false, follow: false } };
  const page = site && findPage(site, path);
  return { title: page ? `${page.title} | ${site!.agency.short_name} (unofficial RE:GOV concept)` : "Preview", description: page ? `Unofficial AI-generated concept of ${new URL(site!.origin).host}. ${page.summary ?? ""}`.trim() : undefined, robots: { index: false, follow: false } };
}
