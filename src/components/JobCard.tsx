import Link from "next/link";
import type { SiteModel } from "@/pipeline/schema";
import type { CrawlResult } from "@/pipeline/types";
import { eyebrow, nn } from "./AppShell";

/** One cell of a gridline list: the parent <ul> draws the top/left rules, each card its right/bottom. */
export function JobCard({ id, site, crawl, index, className = "" }: { id: string; site: SiteModel; crawl: CrawlResult; index: number; className?: string }) {
  const kind = (site.site_kind ?? "").replace(/_/g, " ");
  const v = encodeURIComponent(site.generated_at);
  const cover = site.assets.cover ? `/api/jobs/${id}/${site.assets.cover}?v=${v}` : null;
  const logo = site.assets.logo ? `/api/jobs/${id}/${site.assets.logo}?v=${v}` : null;
  return (
    <li className={`${className} group relative flex flex-col border-r border-b border-kapwa-brand-900 bg-white`}>
      <div className="relative aspect-[16/9] overflow-hidden bg-kapwa-brand-900 border-b border-kapwa-brand-900">
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
        )}
        <span className={`absolute left-0 top-0 bg-kapwa-brand-900 px-2.5 py-1.5 ${eyebrow} text-white`}>{nn(index)} · {kind}</span>
        {logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" className="absolute bottom-3 right-3 size-12 bg-white object-contain p-1 border border-kapwa-brand-900" />
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display font-normal leading-snug text-neutral-900 text-[22px] tracking-tight"><Link href={`/preview/${id}`} className="after:absolute after:inset-0 group-hover:text-kapwa-brand-900">{site.agency.name}</Link></h3>
        <p className="mt-1.5 text-sm text-neutral-500 tabular-nums">{new URL(crawl.origin).host} · {site.pages.length} pages{crawl.archive ? ` · ${crawl.archive.date.slice(0, 4)} archive` : ""}</p>
        <div className="mt-auto pt-5 flex items-center gap-4 text-sm font-semibold">
          <Link href={`/preview/${id}`} className="relative z-10 border-b-2 border-kapwa-brand-900 hover:text-kapwa-brand-900 hover:border-kapwa-brand-900">View site →</Link>
          <Link href={`/report/${id}`} className="relative z-10 text-neutral-600 hover:text-kapwa-brand-900">Report</Link>
          <a href={crawl.origin} target="_blank" rel="noreferrer" className="relative z-10 ml-auto text-xs font-medium text-neutral-400 hover:text-neutral-700">Original ↗</a>
        </div>
      </div>
    </li>
  );
}

export const cardGrid = "grid border-t border-l border-kapwa-brand-900";
