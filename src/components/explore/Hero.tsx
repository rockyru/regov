/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { Portal } from "@/lib/explore/types";

/**
 * The Explore hero (docs/explore.md): one viewport of photograph under a ruled grid, the town's
 * name broken into letters that each sit in, and are cut by, their own cells. Styles:
 * src/app/explore/explore.css. Cell positions are set there per breakpoint (.ih-*). The nav is
 * SiteNav, fixed over every section.
 */
export function Hero({ portal: x }: { portal: Portal }) {
  const letters = x.town.toLowerCase().split("");
  const tel = `tel:${x.office.phone.replace(/\D/g, "")}`;
  return (
    <section className="ih" aria-label={`${x.town}, ${x.province}`} style={{ "--accent": x.palette.accent } as React.CSSProperties}>
      <img src={x.hero.src} alt={x.hero.alt} className="ih-photo" fetchPriority="high" />
      <div aria-hidden className="ih-rules" />

      <h1 className="ih-word">
        <span className="sr-only">{x.title.join(" ")}</span>
        {letters.map((l, i) => (
          <span key={i} aria-hidden className={`ih-cell ih-letter ih-l${i}`} style={{ "--d": `${180 + i * 110}ms` } as React.CSSProperties}><b>{l}</b></span>
        ))}
      </h1>

      <a href="#plan" className="ih-cell ih-link ih-plan">Plan your trip</a>
      <a href={tel} className="ih-cell ih-link ih-call">Call the tourism office</a>
      <p className="ih-cell ih-since"><span><b>{x.notes.since[0]}</b>{x.notes.since[1]}</span></p>
      <p className="ih-cell ih-tagline">{x.notes.tagline.map((t) => <span key={t}>{t}</span>)}</p>
      <p className="ih-cell ih-concept">Unofficial concept by <Link href="/">RE:GOV</Link>. Not made by the LGU or the Department of Tourism. Photo is an AI placeholder.</p>
    </section>
  );
}
