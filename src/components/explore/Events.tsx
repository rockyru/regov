"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { Portal } from "@/lib/explore/types";
import { Room } from "./Room";
import { MONTHS } from "./kinds";
import { eventStatus, useToday } from "./EventStatus";

/**
 * Events: the year as twelve columns with each happening pinned in its month and a line for
 * today, then a card for each, saying whether it is past or still to come (worked out in the
 * reader's browser, so the page never goes stale). Each opens its own page (EventView). Only what the LGU's pages list; days kept
 * every year say so. Styles: .ev-* in src/app/explore/explore.css.
 */

export function Events({ portal: x }: { portal: Portal }) {
  const now = useToday();
  const base = `/explore/${x.slug}/events`;
  const events = [...x.events].sort((a, b) => a.month - b.month);
  const photos = [...new Set([x.events.find((e) => e.photo)?.photo?.src, ...events.map((e) => e.photo?.src)].filter((s): s is string => !!s))];
  const yearly = events.filter((e) => !e.year).length;

  // Today, as a fraction of the year
  const at = now ? (now.getMonth() + (now.getDate() - 1) / new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()) / 12 : null;

  return (
    <section id="events" className="ev xp-lit" aria-labelledby="events-title">
      <Room photos={photos} />
      <header className="pl-head"><p><b>03</b>Events</p><p>{x.town} · through the year</p></header>

      <div className="ev-intro" data-room={photos[0]}>
        <div>
          <p className="pl-kicker">On the town&apos;s calendar</p>
          <h2 id="events-title" className="pl-h">A year<br />in <span className="pl-outline">{x.town}.</span></h2>
        </div>
        <dl className="ev-sum">
          <div><dt>Listed by the LGU</dt><dd>{events.length}</dd></div>
          <div><dt>Kept every year</dt><dd>{yearly}</dd></div>
        </dl>
      </div>

      <div className="ev-year" style={{ "--at": at ?? 0 } as React.CSSProperties}>
        {MONTHS.map((name, i) => {
          const here = events.filter((e) => e.month === i + 1);
          return (
            <div key={name} className={`ev-month ${now && now.getMonth() === i ? "is-now" : ""}`}>
              <p className="ev-month-name"><span className="ev-long">{name.slice(0, 3)}</span><span className="ev-short" aria-hidden>{name[0]}</span></p>
              {here.map((e) => (
                <Link key={e.slug} href={`${base}/${e.slug}`} className="ev-chip" data-room={e.photo?.src}>
                  <b>{e.dates.replace(/, every year$/, "")}</b><span>{e.name}</span>
                </Link>
              ))}
            </div>
          );
        })}
        {at !== null && <span className="ev-today" aria-hidden><i>Today</i></span>}
      </div>

      <ol className="ev-grid">
        {events.map((e) => (
          <li key={e.slug} data-room={e.photo?.src}>
            <Link href={`${base}/${e.slug}`} className="ev-card">
              <div className="ev-media">
                {e.photo ? <img src={e.photo.src} alt="" loading="lazy" /> : <span className="ev-media-month xp-display" aria-hidden>{MONTHS[e.month - 1]}</span>}
                <span className="ev-status">{now ? eventStatus(e, now) : ""}</span>
              </div>
              <div className="ev-body">
                <p className="ev-dates">{e.dates}{e.year ? `, ${e.year}` : ""}</p>
                <h3>{e.name}</h3>
                {e.note && <p className="ev-note">{e.note}</p>}
                <span className="ev-source">Source: {e.source.label}</span>
              </div>
            </Link>
          </li>
        ))}
      </ol>
      <p className="pl-note">Only the events the LGU&apos;s pages list, with their dates as published. Check the source before you travel. Photos are AI placeholders.</p>
    </section>
  );
}
