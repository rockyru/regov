import Link from "next/link";
import type { SiteModel } from "@/pipeline/schema";
import { eyebrow, navHref } from "./Shell";
import { isLgu } from "@/lib/civic";
import { WIKIBAYAN, peso, projectUrl, statusLabel, type Matched, type Scope } from "@/lib/wikibayan";

const nn = (i: number) => String(i + 1).padStart(2, "0");
export const PROJECTS_SLUG = "public-projects";

const STATUS_TONE: Record<string, string> = { completed: "text-kapwa-green-800", ongoing: "text-kapwa-brand-800", delayed: "text-kapwa-orange-700", suspended: "text-kapwa-red-700" };
const place = (p: Matched) => [p.city, p.province].filter(Boolean).join(", ") || p.region || "";

/** One row per project: name and sector, budget, status, physical accomplishment, link to its WikiBayan record. */
export function ProjectList({ rows, showPlace }: { rows: Matched[]; showPlace?: boolean }) {
  return (
    <ol className="border-t border-neutral-900">
      {rows.map((p) => (
        <li key={p.id} className="border-b border-neutral-200">
          <a href={projectUrl(p.id)} target="_blank" rel="noreferrer" className="group grid gap-x-6 gap-y-2 py-4 sm:grid-cols-[1fr_7rem_7rem_8rem] sm:items-baseline">
            <span className="min-w-0">
              <span className="block font-semibold leading-snug text-neutral-900 group-hover:text-kapwa-brand-900">{p.name} <span aria-hidden className="text-neutral-500">↗</span></span>
              <span className="block mt-0.5 text-sm text-neutral-600">{[p.sector, showPlace ? place(p) : "", p.implementing_agency].filter(Boolean).join(" · ")}</span>
            </span>
            <span className="text-sm sm:text-right"><span className="sm:hidden text-neutral-500">Budget </span><span className="font-semibold tabular-nums text-neutral-900">{peso(p.budget)}</span></span>
            <span className={`text-sm font-semibold ${STATUS_TONE[p.status] ?? "text-neutral-600"}`}>{statusLabel(p.status)}</span>
            <span className="text-sm">
              {p.pct != null ? (
                <span className="flex items-center gap-2"><span aria-hidden className="h-1.5 flex-1 bg-neutral-200"><span className="block h-full bg-kapwa-brand-800" style={{ width: `${Math.min(100, Math.max(0, p.pct))}%` }} /></span><span className="tabular-nums text-neutral-700">{Math.round(p.pct)}%<span className="sr-only"> physically complete</span></span></span>
              ) : <span className="text-neutral-500">No progress report</span>}
              <span className="block mt-0.5 text-xs text-neutral-500 tabular-nums">{p.source_count} {p.source_count === 1 ? "source" : "sources"}</span>
            </span>
          </a>
        </li>
      ))}
    </ol>
  );
}

export const COMMUNITY_NOTE = "Community-sourced record from WikiBayan, not verified by the agency or by RE:GOV.";

/** Compact block for the home page's transparency section. Renders nothing when WikiBayan has no match. */
export function ProjectsOnRecord({ site, rows }: { site: SiteModel; rows: Matched[] }) {
  if (!rows.length) return null;
  const close = rows.filter((p) => p.scope === "local" || p.scope === "agency");
  const shown = (close.length ? close : rows).slice(0, 5);
  return (
    <div className="mt-12">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-2 border-b border-neutral-900 pb-2">
        <h3 className={`${eyebrow} text-neutral-500`}>Public projects on record · WikiBayan</h3>
        <Link href={navHref(site.jobId, PROJECTS_SLUG)} className="text-sm font-semibold text-kapwa-brand-800 hover:text-kapwa-brand-950">All {rows.length} {rows.length === 1 ? "project" : "projects"} →</Link>
      </div>
      <div className="[&>ol]:border-t-0"><ProjectList rows={shown} showPlace={!close.length} /></div>
      <p className="mt-3 text-sm text-neutral-500">{COMMUNITY_NOTE} Each project links to its sources.</p>
    </div>
  );
}

/** Virtual page: /preview/<job>/public-projects */
export function PublicProjectsPage({ site, rows }: { site: SiteModel; rows: Matched[] }) {
  const loc = site.locality ?? { province: "", region: "", city: "" };
  const who = site.agency.short_name || site.agency.name;
  const area = [loc.city, loc.province].filter(Boolean).join(", ") || loc.region || who;
  const here = site.site_kind === "province" ? loc.province : loc.city;
  const title: Record<Scope, string> = { local: `In ${here || area}`, province: `Elsewhere in ${loc.province}`, metro: "Elsewhere in Metro Manila", agency: `Implemented by ${who}` };
  const deck: Record<Scope, string> = { local: site.site_kind === "province" ? "Projects anywhere in the province." : "Projects recorded at this locality.", province: "Projects in other towns and cities of the same province.", metro: "Metro Manila projects, including those WikiBayan records without a city.", agency: "Projects that name this office as the implementing agency." };
  const groups = (["agency", "local", "province", "metro"] as Scope[]).map((s) => ({ scope: s, rows: rows.filter((p) => p.scope === s) })).filter((g) => g.rows.length);
  const total = rows.reduce((t, p) => t + p.budget, 0);
  const figures: [string | number, string][] = [[rows.length, rows.length === 1 ? "project on record" : "projects on record"], [peso(total), "approved budget"], [rows.filter((p) => p.status === "completed").length, "completed"], [rows.filter((p) => p.status !== "completed").length, "ongoing, planned or delayed"]];
  return (
    <>
      <div className="border-b-2 border-neutral-900 bg-white">
        <div className="container-gov py-10 lg:py-14">
          <nav aria-label="Breadcrumb" className={`${eyebrow} text-neutral-500 flex gap-2`}><Link href={navHref(site.jobId, "home")} className="hover:text-kapwa-brand-900">Home</Link><span aria-hidden className="text-neutral-400">/</span><span className="text-neutral-900">Public projects</span></nav>
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_minmax(0,32rem)] lg:gap-16 items-end">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-[-0.02em] leading-[1.0] text-neutral-900">Public projects</h1>
            <p className="text-lg leading-relaxed text-neutral-600 lg:border-l lg:border-neutral-300 lg:pl-6">Roads, bridges, flood control and other government projects {!isLgu(site) ? `implemented by ${who}` : `in and around ${area}`}, with their budgets, status and sources, from the open WikiBayan record.</p>
          </div>
        </div>
      </div>
      <div className="container-gov">
        {rows.length > 0 && (
          <dl className="mt-10 grid grid-cols-2 md:grid-cols-4 border-t border-l border-neutral-900">
            {figures.map(([v, l]) => <div key={l} className="border-r border-b border-neutral-900 p-5"><dd className="text-3xl font-extrabold tracking-tight tabular-nums text-neutral-900">{v}</dd><dt className="mt-1 text-sm text-neutral-600">{l}</dt></div>)}
          </dl>
        )}
        {groups.map((g, i) => (
          <section key={g.scope} className="py-12">
            <div className="border-t-2 border-neutral-900 pt-5 grid gap-3 lg:grid-cols-[1fr_minmax(0,30rem)] lg:gap-12 items-end">
              <div><div className={`${eyebrow} text-kapwa-brand-700`}>{nn(i)}</div><h2 className="mt-2 text-3xl font-bold tracking-tight text-neutral-900">{title[g.scope]}</h2></div>
              <p className="text-[15px] text-neutral-600 lg:text-right">{deck[g.scope]}</p>
            </div>
            <div className="mt-6"><ProjectList rows={g.rows} showPlace={g.scope !== "local" || site.site_kind === "province"} /></div>
          </section>
        ))}
        {rows.length === 0 && <p className="py-12 text-lg text-neutral-600">WikiBayan has no projects recorded for {area} yet.</p>}
        <div className="mb-6 border-t border-neutral-300 pt-5 grid gap-4 lg:grid-cols-2">
          <p className="text-sm leading-relaxed text-neutral-600"><strong className="font-semibold text-neutral-900">{COMMUNITY_NOTE}</strong> Volunteers add each project with its sources and moderators review it. Figures may be incomplete or out of date; open a project to see where every number comes from.</p>
          <p className="text-sm leading-relaxed text-neutral-600 lg:text-right">Know a project that is missing or wrong? <a href={`${WIKIBAYAN}/projects`} target="_blank" rel="noreferrer" className="font-semibold text-kapwa-brand-800 underline underline-offset-2">Add or flag it on WikiBayan ↗</a></p>
        </div>
      </div>
    </>
  );
}
