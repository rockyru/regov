import { notFound } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/admin";
import { loadStoredSite } from "@/lib/siteEdit";
import { AppHeader, AppFooter, eyebrow } from "@/components/AppShell";
import { SiteEditor } from "@/components/SiteEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Review | RE:GOV", robots: { index: false, follow: false } };

/** Operator-only review editor (?token=ADMIN_TOKEN). */
export default async function Edit({ params, searchParams }: { params: Promise<{ jobId: string }>; searchParams: Promise<{ token?: string }> }) {
  const [{ jobId }, { token = "" }] = await Promise.all([params, searchParams]);
  if (!isAdmin(token)) notFound();
  const stored = await loadStoredSite(jobId);
  if (!stored) notFound();
  return (
    <>
      <AppHeader crumb="Review" />
      <main className="flex-1">
        <div className="container-gov pt-10 pb-16">
          <p className={`${eyebrow} text-kapwa-brand-900`}>Review</p>
          <h1 className="mt-2 text-4xl font-display font-normal tracking-tight">{stored.site.agency.name}</h1>
          <p className="mt-2 max-w-3xl text-neutral-600">Correct what the agent got wrong before anyone adopts this concept: names, positions, numbers, fees, dates. Open each page next to its original and tick it once it matches. <Link href={`/report/${jobId}`} className="underline">Migration report</Link></p>
          <div className="mt-6"><SiteEditor initial={stored.site} token={token} hasGenerated={stored.hasGenerated} /></div>
        </div>
      </main>
      <AppFooter />
    </>
  );
}
