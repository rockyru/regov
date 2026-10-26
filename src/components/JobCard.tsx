import Link from "next/link";
import type { SiteModel } from "@/pipeline/schema";
import type { CrawlResult } from "@/pipeline/types";

export function JobCard({ id, site, crawl, compact = false }: { id: string; site: SiteModel; crawl: CrawlResult; compact?: boolean }) {
  const kind = (site.site_kind ?? "").replace(/_/g, " ");
  const v = encodeURIComponent(site.generated_at);
  const cover = site.assets.cover ? `/api/jobs/${id}/${site.assets.cover}?v=${v}` : null;
  const logo = site.assets.logo ? `/api/jobs/${id}/${site.assets.logo}?v=${v}` : null;
  return (
    <li className="group relative flex flex-col overflow-hidden rounded-3xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-16px_rgba(0,56,168,0.25)] ring-1 ring-neutral-200/80 transition hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_24px_48px_-20px_rgba(0,56,168,0.4)]">
      <div className={`relative overflow-hidden bg-kapwa-brand-900 ${compact ? "aspect-[21/9]" : "aspect-[16/9]"}`}>
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
        )}
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-kapwa-brand-900 backdrop-blur">{kind}</span>
        {logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" className="absolute -bottom-5 right-4 size-12 rounded-full bg-white object-contain p-1 shadow-md ring-1 ring-neutral-200" />
        )}
      </div>
      <div className={`flex flex-1 flex-col px-5 ${compact ? "pb-4 pt-4" : "pb-5 pt-5"}`}>
        <h3 className={`pr-14 font-bold leading-snug text-neutral-900 ${compact ? "text-[17px] line-clamp-1" : "text-lg"}`}><Link href={`/preview/${id}`} className="after:absolute after:inset-0">{site.agency.name}</Link></h3>
        <p className="mt-1 text-sm text-neutral-500">{new URL(crawl.origin).host} · {site.pages.length} pages{crawl.archive ? ` · from the ${crawl.archive.date.slice(0, 4)} archive` : ""}</p>
        <div className={`mt-auto flex items-center gap-2 ${compact ? "pt-3" : "pt-5"}`}>
          <Link href={`/preview/${id}`} className="relative z-10 inline-flex items-center gap-1.5 rounded-full bg-kapwa-brand-800 px-4 py-2 text-sm font-semibold text-white hover:bg-kapwa-brand-900">View site <span aria-hidden>→</span></Link>
          <Link href={`/report/${id}`} className="relative z-10 inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold text-neutral-700 ring-1 ring-neutral-200 hover:bg-neutral-50">Report</Link>
          <a href={crawl.origin} target="_blank" rel="noreferrer" className="relative z-10 ml-auto text-xs text-neutral-400 hover:text-neutral-700">Original ↗</a>
        </div>
      </div>
    </li>
  );
}
