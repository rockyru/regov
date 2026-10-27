import { notFound } from "next/navigation";
import { loadSite, findPage } from "@/lib/jobs";
import { GovStrip, Header, Footer, PreviewBar } from "@/components/site/Shell";
import { HomePage, ContentPage } from "@/components/site/Pages";

export const dynamic = "force-dynamic";

export default async function Preview({ params }: { params: Promise<{ jobId: string; slug?: string[] }> }) {
  const { jobId, slug = [] } = await params;
  const site = await loadSite(jobId);
  if (!site) notFound();
  const page = findPage(site, slug.join("/"));
  if (!page) notFound();
  return (
    <div className="editorial flex flex-1 flex-col">
      <PreviewBar site={site} currentSource={page.source_url} />
      <GovStrip />
      <Header site={site} />
      <main className="flex-1">{page.slug === "home" ? <HomePage site={site} page={page} /> : <ContentPage site={site} page={page} />}</main>
      <Footer site={site} />
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ jobId: string; slug?: string[] }> }) {
  const { jobId, slug = [] } = await params;
  const site = await loadSite(jobId);
  const page = site && findPage(site, slug.join("/"));
  return { title: page ? `${page.title} | ${site!.agency.short_name} (unofficial RE:GOV concept)` : "Preview", description: page ? `Unofficial AI-generated concept of ${new URL(site!.origin).host}. ${page.summary ?? ""}`.trim() : undefined, robots: { index: false, follow: false } };
}
